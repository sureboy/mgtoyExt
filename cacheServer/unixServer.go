package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"sync"
)

var (
	unixBuffer = make([]byte, 1024)
	//sendBuffer = make([]byte, 1024)
	unixMsgPool = sync.Pool{
		New: func() interface{} {
			//buf := make([]byte, 20)
			return &UnixMsg{sendBuffer: make([]byte, 1024)}
		},
	}
)

type UnixMsg struct {
	DB         *DataStruct `json:"db"`
	Key        string      `json:"key"`
	addr       *net.UnixAddr
	conn       *net.UnixConn
	sendBuffer []byte
}

func NewUnixMsg(key string, conn *net.UnixConn, _addr *net.UnixAddr) *UnixMsg {
	u := unixMsgPool.Get().(*UnixMsg)
	u.conn = conn
	u.addr = _addr
	u.Key = key
	return u
}
func (u *UnixMsg) Clean() {
	u.sendBuffer = u.sendBuffer[:0]
	u.DB = nil
	//u.Key = ""

	unixMsgPool.Put(u)
}
func (u *UnixMsg) SendMsg(db *DataStruct) error {
	u.DB = db
	var err error
	u.sendBuffer, err = json.Marshal(u)
	if err != nil {
		return err
	}
	//fmt.Println("send addr", u.addr)
	_, err = u.conn.WriteToUnix(u.sendBuffer, u.addr)
	u.Clean()

	return err
}
func handleUnixMsg(m byte, msg string, conn *net.UnixConn, _addr *net.UnixAddr, cache *SafeMap) {
	//fmt.Println("unixMsg", m, m|0xF0, msg)
	pack := NewTaskPacket()
	pack.handle = func() {

		dbs := NewUnixMsg(msg, conn, _addr)
		//fmt.Println("handle", dbs.Key)
		dbCache, ok := cache.Get(dbs.Key)
		if ok {
			if (m & 0xF0) == 0 {
				//fmt.Println("unix to udp", dbs.Key, m)
				rec := dbCache.DB.(*Receive)
				pack.UpdateMsg(dbCache.Num, m|0xF0)
				pack.SetUDPAddr(&net.UDPAddr{IP: rec.RemoteIP, Port: rec.RemotePort})
				//dbCache = nil
				//} else {

				//if dbCache.IsTimeOut(20) {
				//	fmt.Println("time out")
				//dbCache = nil
				//}
			}
		}

		err := dbs.SendMsg(dbCache)
		if err != nil {
			fmt.Println(err)
		}
	}
	/*
		pack.back = func() {
			err := dbs.SendMsg(conn)
			if err != nil {
				fmt.Println(err)
			}
			//w.Done()
		}
	*/
	//fmt.Println("end")
	pack.AddWorkChan()
}

/*
	func forwardMsgToUDP(m byte, key string, cache *SafeMap) {
		pack := NewTaskPacket()

		pack.handle = func(p *TaskPacket) {
			dbCache, ok := cache.Get(key)
			if !ok {
				return
			}
			rec := dbCache.DB.(*Receive)
			p.SetUDPAddr(&net.UDPAddr{IP: rec.RemoteIP, Port: rec.RemotePort})
			p.UpdateMsg(dbCache.Num, m)

		}
		pack.AddWorkChan()
	}
*/
func HandUnixMsg(ListenConn interface{}, cache *SafeMap) {
	conn := ListenConn.(*net.UnixConn)
	n, _addr, err := conn.ReadFromUnix(unixBuffer)
	if err != nil {
		log.Println("ReadFromUnix failed:", err)
		return
	}
	if n == 0 {
		log.Println("ReadFromUnix failed: len = 0")
		return
	}
	//msg:= unixBuffer[:n]
	handleUnixMsg(unixBuffer[0], string(unixBuffer[1:n]), conn, _addr, cache)
	/*
		m := unixBuffer[0]
		fmt.Println(m)
		if m == 255 {
			fromCacheToUnix(unixBuffer[0],string(unixBuffer[1:n]), conn, _addr,cache)
		} else {
			//fmt.Println(string(msg[1:]), msg[0])

			forwardMsgToUDP(m, string(unixBuffer[1:n]), cache)

		}
	*/
}
func UnixgramServer(unixAddr string, handleWorker func(interface{})) {
	fmt.Println(unixAddr)
	_, err := os.Stat(unixAddr)
	if err == nil {
		os.Remove(unixAddr)
	}

	addr, err := net.ResolveUnixAddr("unixgram", unixAddr)
	if err != nil {
		log.Fatal("ResolveUnixAddr failed:", err)
	}
	conn, err := net.ListenUnixgram("unixgram", addr)
	if err != nil {
		log.Fatal("ListenUnixgram failed:", err)
	}
	defer conn.Close()
	//fmt.Println(addr.Net)
	for {
		handleWorker(conn)
		//unixBuffer = unixBuffer[:0]

	}
}
