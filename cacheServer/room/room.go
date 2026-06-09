package room

import (
	"sync"
)

type Room struct {
}

var CacheRoom = cacheDB{db: make(map[string]*MsgHandle)}
var (
	buffer = sync.Pool{
		New: func() any {
			//buf := make([]byte, 20)
			return &PostDB{}
		},
	}
)

func NewPostDB() *PostDB {
	db := buffer.Get().(*PostDB)
	db.Msg = ""
	db.Create = false
	db.Id = ""
	return db
}

type PostDB struct {
	Id     string `json:"id"`
	Msg    string `json:"msg"`
	Create bool   `json:"create"`
	Time   int    `json:"time"`
	//Ip    string `json:"ip"`
	//cache any
}

func (db *PostDB) Clean() {

	buffer.Put(db)
}
func (db *PostDB) HandleMsg() *MsgHandle {
	c := ReadCache(db.Id)
	//fmt.Println(c)
	if c == nil {
		if !db.Create {
			return nil
		}
		c = createMsgHandle(db.Id)
		CacheRoom.write(db.Id, c)
	}
	if db.Msg == "" {
		return c
	}
	if db.Create {
		if c.Append != nil {
			c.Append(db.Msg)
		} else {
			c.msg = append(c.msg, db.Msg)
			//fmt.Println("add", c)
		}
	} else {
		if c.Create != nil {
			//fmt.Println("test send", db.Time, db.Create)
			c.Create(db.Msg)
		}
	}
	return c
}

func ReadCache(k string) *MsgHandle {
	return CacheRoom.read(k)
}

func CleanCache(c *MsgHandle) {
	CacheRoom.clean(c)
}
