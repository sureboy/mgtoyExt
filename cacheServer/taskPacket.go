package main

import (
	"log"
	"net"
	"sync"
)

var (
	buffer = sync.Pool{
		New: func() interface{} {
			//buf := make([]byte, 20)
			return &TaskPacket{buf: make([]byte, 12)}
		},
	}

	//workerCount = runtime.NumCPU()
	workChan = make(chan *TaskPacket, 100)
)

func WorkerRec(ListenConn interface{}, cache *SafeMap) {
	//var err error
	conn := ListenConn.(*net.UDPConn)
	for pkt := range workChan {
		pkt.handleTaskPacket(conn, cache)
		pkt.Clean()
	}
}

type TaskPacket struct {
	buf    []byte
	addr   *net.UDPAddr
	len    int
	handle func()
	//subTack []*TaskPacket
	//back   func()
	//bufPool *sync.Pool
	//num  byte
	//msg  []byte
}

func NewTaskPacket() *TaskPacket {
	t := buffer.Get().(*TaskPacket)
	t.len = 0
	t.addr = nil
	t.handle = nil
	//t.subTack = nil
	//t.back = nil
	//t.bufPool = &buffer
	return t
}
func (t *TaskPacket) SetUDPAddr(a *net.UDPAddr) {
	t.addr = a
}
func (t *TaskPacket) Clean() {
	//t.buf = t.buf[:0]
	//for _, subT := range t.subTack {
	//	buffer.Put(subT)
	//}
	//t.subTack = nil

	buffer.Put(t)
}

// func (t *TaskPacket) GetSubTask() *TaskPacket {
// subT := NewTaskPacket()
// t.subTack = append(t.subTack, subT)
// return subT
// }
func (u *TaskPacket) UpdateMsg(msg ...byte) {
	u.len = len(msg)
	if u.len == 0 {
		return
	}
	/*
		if u.buf == nil {
			u.buf = *(buffer.Get().(*[]byte))
		}
	*/
	//fmt.Println("update", msg)
	//u.buf = append(u.buf, msg...)
	copy(u.buf, msg)

}

func addWorkChan(p *TaskPacket) {
	workChan <- p
	/*
		//fmt.Println("--", p.buf, p.len)
		select {
		case workChan <- p:
		default:
			<-workChan
			addWorkChan(p)
		}
	*/
}
func (p *TaskPacket) AddWorkChan() {
	addWorkChan(p)
}

/*
	func runCacheCleanTask() {
		if cacheMap.IsClean() {
			pack := NewTaskPacket()
			pack.handle = func() {
				cacheMap.Clean()
			}
			pack.AddWorkChan()
		}
	}
*/
func (pack *TaskPacket) InitConn(conn *net.UDPConn) (err error) {
	pack.len, pack.addr, err = conn.ReadFromUDP(pack.buf)
	return
}
func (pack *TaskPacket) handleTaskPacket(conn *net.UDPConn, cache *SafeMap) {
	if pack.handle != nil {
		pack.handle()
	}

	//if len(pack.subTack) > 0 {
	//	for _, subT := range pack.subTack {
	//		subT.handleTaskPacket(conn, cache)
	//	}

	//}
	//fmt.Println(pack)
	switch pack.len {
	case 1:
		pack.buf[1] = 255
		pack.len = 2
		cache.ReadData(pack.addr, func(db *DataStruct) {
			pack.len = 1
			db.SetNum(pack.buf[0])
		})
		//fmt.Println(pack.buf[:len])
		conn.WriteToUDP(pack.buf[:pack.len], pack.addr)

	case 12:
		cache.UpdateData(pack.addr, func(db *DataStruct) {
			var rec *Receive
			if db.DB == nil {
				rec = &Receive{}
				db.DB = rec
				//runCacheCleanTask()
			} else {
				if db.getNextNum() != pack.buf[0] {
					log.Println("num err")
					return
				}
				rec = db.DB.(*Receive)
			}
			rec.Update(pack.buf[:pack.len], pack.addr.Port, pack.addr.IP)
			//log.Println(rec, pack.buf[0], db.Num)
			//pack.buf = []byte{pack.buf[0]}
			//addWorkChan(pack)
			//db.Num = pack.buf[0]
			db.SetNum(pack.buf[0])
			conn.WriteToUDP(pack.buf[:1], pack.addr)
		})
	case 2:
		if pack.addr != nil {
			//fmt.Println(pack.buf[:pack.len], pack.addr, pack.len)
			conn.WriteToUDP(pack.buf[:pack.len], pack.addr)
		}

		//fmt.Println(string(pack.buf[:pack.len]), pack.len)

	}

}
