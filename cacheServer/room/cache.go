package room

import (
	"sync"
	"time"
)

var (
	chanLen    = 10
	chanbuffer = sync.Pool{
		New: func() any {
			//buf := make([]byte, 20)
			return &MsgHandle{msg: []string{}}
		},
	}
)

func createMsgHandle(id string) *MsgHandle {
	db := chanbuffer.Get().(*MsgHandle)

	db.id = id
	db.Create = nil
	db.Append = nil

	return db

}
func (db *MsgHandle) clean() {
	if db.endTimer == nil {
		return
	}
	db.endTimer.Stop()
	db.endTimer = nil
	db.msg = db.msg[:0]
	chanbuffer.Put(db)
}
func (db *MsgHandle) SetAppend(w func(string)) {
	db.Append = w
	for _, m := range db.msg {
		db.Append(m)
	}
	db.msg = db.msg[:0]
}
func (db *MsgHandle) Msg() []string {
	m := db.msg

	db.msg = db.msg[:0]
	//log.Println(len(db.msg), len(m))
	return m
}

// var CacheIP = CacheDB{}
type MsgHandle struct {
	id       string
	msg      []string
	endTimer *time.Timer
	Create   func(string)
	Append   func(string)
}
type cacheDB struct {
	db map[string]*MsgHandle
	sync.RWMutex
}

func (c *cacheDB) clean(dbc *MsgHandle) {
	c.Lock()
	//defer c.Unlock()

	delete(c.db, dbc.id)
	c.Unlock()
	dbc.clean()
}
func (c *cacheDB) read(k string) *MsgHandle {
	c.RLock()
	v := c.db[k]
	c.RUnlock()
	return v
}
func (c *cacheDB) write(k string, v *MsgHandle) {
	c.Lock()
	c.db[k] = v
	c.Unlock()
	v.endTimer = time.AfterFunc(3*time.Minute, func() {
		if c.read(k) == nil {
			return
		}
		c.clean(v)
	})
}
