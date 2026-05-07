package WebRtc

import "sync"

var CacheID = CacheDB{db: make(map[string]*dbChan)}
var chanLen = 10

func CreateDBChan() *dbChan {
	return &dbChan{
		create: make(chan string, chanLen),
		append: make(chan string, chanLen),
	}
}

// var CacheIP = CacheDB{}
type dbChan struct {
	create chan string
	append chan string
}
type CacheDB struct {
	db map[string]*dbChan
	sync.RWMutex
}

func (c *CacheDB) read(k string) *dbChan {
	c.RLock()
	v := c.db[k]
	c.RUnlock()
	return v
}
func (c *CacheDB) write(k string, v *dbChan) {
	c.Lock()
	c.db[k] = v
	c.Unlock()
}
