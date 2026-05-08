package room

import "sync"

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
	return buffer.Get().(*PostDB)
}

type PostDB struct {
	Id     string `json:"id"`
	Msg    string `json:"msg"`
	Create bool   `json:"create"`
	//Ip    string `json:"ip"`
	//cache any
}

func (db *PostDB) clean() {
	buffer.Put(db)
}
func (db *PostDB) HandleMsg() *MsgHandle {
	defer db.clean()
	c := ReadCache(db.Id)
	if c == nil {
		if !db.Create {
			return nil
		}
		c = createMsgHandle(db.Id)
		CacheRoom.write(db.Id, c)
	}
	if db.Create {
		if c.Append != nil {
			c.Append(db.Msg)
		} else {
			c.msg = append(c.msg, db.Msg)
		}
	} else {
		if c.Create != nil {
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
