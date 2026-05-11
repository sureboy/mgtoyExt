package udp

import (
	"cacheServer/room"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"sync"
)

var (
	udpMsgbuffer = sync.Pool{
		New: func() any {
			return &SendMsg{}
		},
	}
)

type SendMsg struct {
	Time int    `json:"time"`
	Msg  string `json:"msg"`
}

func createSendMsg(t int) *SendMsg {
	v := udpMsgbuffer.Get().(*SendMsg)
	v.Time = t
	return v
}
func (s *SendMsg) clean() {
	udpMsgbuffer.Put(s)
}
func getPostDB(buf []byte) *room.PostDB {
	db := room.NewPostDB()
	json.Unmarshal(buf, db)
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
	var buf [1472]byte

	//json.NewDecoder()
	for {

		len, addr, err := conn.ReadFromUDP(buf[:])
		if err != nil {
			fmt.Println("Error reading:", err)
			continue
		}
		db := getPostDB(buf[:len])
		if db.Id == "" {
			db.Id = addr.IP.String()
		}
		t := db.Time

		write := func(m string) {
			sendMsg := createSendMsg(t)
			defer sendMsg.clean()
			sendMsg.Msg = m
			data, err := json.Marshal(sendMsg)
			if err != nil {
				log.Println(err)
				return
				//panic(err)
			}
			//fmt.Println(string(data))
			_, err = conn.WriteToUDP(data, addr)
			if err != nil {
				log.Println(err)
				return
				//log.Println(m, err)
			}
		}
		c := db.HandleMsg()
		//fmt.Println("udp create", db.Id)
		if c != nil {
			if db.Create {
				if c.Create == nil {
					c.Create = write
				}
			} else {
				if c.Append == nil {
					c.SetAppend(write)
				}
			}
		}
		write("")
		//packet.Clean()
		db.Clean()
	}
}
