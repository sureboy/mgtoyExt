package main

import (
	"fmt"
	"net"
)

func UDPServer(udpAddr string, synchandleWorker func(interface{})) error {
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

	synchandleWorker(conn)
	//var err error
	for {
		// 读取数据
		//ptr := buffer.Get().(*[]byte)
		packet := NewTaskPacket()
		//packet := buffer.Get().(*TaskPacket)
		packet.len, packet.addr, err = conn.ReadFromUDP(packet.buf)

		if err != nil {
			packet.Clean()
			//buffer.Put(packet)
			fmt.Println("Error reading:", err)
			continue
		}
		//fmt.Println(packet.len)
		//fmt.Println(packet.len)
		packet.AddWorkChan()
		//handleUDPMsg(buf, n, clientAddr)

	}
}
