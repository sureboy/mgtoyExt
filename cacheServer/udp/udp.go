package udp

import (
	"cacheServer/room"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"sync"
	"time"
)

var (
	buffer = sync.Pool{
		New: func() interface{} {
			//buf := make([]byte, 20)
			return &TaskPacket{len: 0, msg: make(chan []byte, 1)}
		},
	}
	workChan = make(chan *TaskPacket, 100)
)

type TaskPacket struct {
	buf    [1472]byte
	msg    chan []byte
	addr   *net.UDPAddr
	len    int
	handle func()
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
func (t *TaskPacket) HandleMsg(conn *net.UDPConn) error {
	defer t.Clean()
	for {
		select {
		case res := <-t.msg:
			_, err := conn.WriteToUDP(res, t.addr)
			if err != nil {
				return err
			}
			// 正常接收
		case <-time.After(30 * time.Second):
			// 超时退出
			return fmt.Errorf("time out")
		}
	}
}
func (p *TaskPacket) AddWorkChan() {
	workChan <- p
}

func (t *TaskPacket) Clean() {
	//close(t.msg)
	t.addr = nil
	buffer.Put(t)
}
func (t *TaskPacket) getPostDB() *room.PostDB {
	db := room.NewPostDB()
	json.Unmarshal(t.buf[:t.len], db)
	return db
}
func UDPServer(udpAddr string) error {
	addr, err := net.ResolveUDPAddr("udp", udpAddr)
	if err != nil {
		return err

	}

	// 创建UDP连接
	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()

	fmt.Println("UDP server listening on", addr)
	//synchandleWorker(conn)
	for {
		// 读取数据
		//ptr := buffer.Get().(*[]byte)
		packet := NewTaskPacket()
		//packet := buffer.Get().(*TaskPacket)
		packet.len, packet.addr, err = conn.ReadFromUDP(packet.buf[:])

		if err != nil {
			packet.Clean()
			//buffer.Put(packet)
			fmt.Println("Error reading:", err)
			continue
		}
		//fmt.Println(packet.len)
		//fmt.Println(packet.len)
		db := packet.getPostDB()
		if db.Id == "" {
			db.Id = packet.addr.IP.String()
		}
		write := func(m string) {
			_, err := conn.WriteToUDP([]byte(m), packet.addr)
			if err != nil {
				log.Println(err)
			}
		}
		c := db.HandleMsg()
		if c != nil {
			if db.Create {
				if c.Create == nil {
					c.Create = write
				}

			} else {
				if c.Append == nil {
					c.SetAppend(write)
					//c.Append = write
				}
			}
		}
		packet.Clean()
		//handleUDPMsg(buf, n, clientAddr)

	}
}
