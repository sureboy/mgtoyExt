package room

import (
	"sync"
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

	db.msg = db.msg[:]
	chanbuffer.Put(db)
}
func (db *MsgHandle) SetAppend(w func(string)) {
	db.Append = w
	for _, m := range db.msg {
		db.Append(m)
	}
	db.msg = db.msg[:]
}
func (db *MsgHandle) Msg() []string {
	m := db.msg

	//db.msg = db.msg[:]

	return m
}

// var CacheIP = CacheDB{}
type MsgHandle struct {
	id  string
	msg []string

	Create func(string)
	Append func(string)
}
type cacheDB struct {
	db map[string]*MsgHandle
	sync.RWMutex
}

func (c *cacheDB) clean(dbc *MsgHandle) {
	c.Lock()
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
}
