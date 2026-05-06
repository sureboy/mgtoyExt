package main

import (
	"log"
	"net"
	"time"
)

type Receive struct {
	LocalIP    net.IP
	Carname    string
	RemotePort int
	RemoteIP   net.IP
	Control    int
	//Num        uint8
}

func (r *Receive) Cover(_r *Receive) {
	for i, v := range _r.RemoteIP {
		if r.RemoteIP[i] != v {
			r.RemoteIP[i] = v
		}
	}
	for i, v := range _r.LocalIP {
		if r.LocalIP[i] != v {
			r.LocalIP[i] = v
		}
	}
	if r.RemotePort != _r.RemotePort {
		r.RemotePort = _r.RemotePort
	}
	if r.Carname != _r.Carname {
		r.Carname = _r.Carname
	}
	if r.Control != _r.Control {
		r.Control = _r.Control
	}
}

func (r *Receive) Update(msg []byte, RemotePort int, RemoteIP net.IP) {
	localAddr := msg[8:]
	if r.LocalIP == nil {
		r.LocalIP = make([]byte, len(localAddr))
	}
	if r.RemoteIP == nil {
		r.RemoteIP = make([]byte, len(RemoteIP))
	}

	for k, v := range localAddr {
		//ip = append(ip, v^255)
		r.LocalIP[k] = v ^ 255
	}

	//copy(r.LocalIP, msg[8:])
	copy(r.RemoteIP, RemoteIP)
	//r.Num = msg[0]
	r.Control = int(msg[1])
	r.Carname = string(msg[2:8])
	r.RemotePort = RemotePort

}

type DataStruct struct {
	//LocalIP net.IP
	//Name    string
	//onceback func()
	DB     interface{}
	Update int64
	Num    uint8
}

func (m *DataStruct) SetNum(n uint8) {
	m.Num = n
	/*
		if m.onceback != nil {
			m.onceback()
			m.onceback = nil
		}
	*/
}
func (m *DataStruct) GetTimeOut() int64 {
	//log.Println(time.Now().Unix(), m.Update)
	return m.Update
}
func (m *DataStruct) IsTimeOut(timeOut int64) bool {
	//log.Println(time.Now().Unix(), m.Update)
	return time.Now().UnixMilli()-m.Update > timeOut
}
func (r *DataStruct) getNextNum() uint8 {
	n := r.Num + 1
	if n == 0 {
		n++
	}
	return n
}

func (d *DataStruct) UpdateTimeOut() {
	d.Update = time.Now().UnixMilli()
}

type DataSet struct {
	K string
	V *DataStruct
}

type SafeMap struct {
	//mu      sync.RWMutex
	data    map[string]*DataStruct
	maxLen  int
	timeOut int64
}

func NewSafeMap(l int) *SafeMap {
	if l == 0 {
		l = 1000
	}
	return &SafeMap{
		data:    make(map[string]*DataStruct),
		maxLen:  l,
		timeOut: 3600,
	}
}
func (m *SafeMap) IsClean() bool {
	return len(m.data) > m.maxLen
}
func (m *SafeMap) SetCacheMaxLen(l int) {
	m.maxLen = l
}
func (m *SafeMap) Set(key string, value *DataStruct) {
	value.UpdateTimeOut()
	//m.mu.Lock()
	m.data[key] = value
	//m.mu.Unlock()
	//if len(m.data) >= m.MaxLen {
	//	go m.Clean()
	//}

}

func (m *SafeMap) Clean() {
	log.Println("begin clean")
	list := make([]string, 0, len(m.data))
	//m.mu.RLock()

	for k, v := range m.data {
		if v.IsTimeOut(m.timeOut) {
			//if time.Now().Unix()-v.Update > m.timeOut {
			list = append(list, k)
		}
	}
	//m.mu.RUnlock()
	//m.mu.Lock()
	for _, v := range list {
		delete(m.data, v)
	}
	//m.mu.Unlock()
}

func (m *SafeMap) Get(key string) (*DataStruct, bool) {
	//m.mu.RLock()
	val, ok := m.data[key]
	//m.mu.RUnlock()
	//if ok {
	//	val.UpdateTimeOut()
	//}

	return val, ok
}

func (m *SafeMap) Delete(key string) {
	//m.mu.Lock()
	delete(m.data, key)
	//m.mu.Unlock()
}

func (m *SafeMap) ReadData(clientAddr *net.UDPAddr, hand func(*DataStruct)) {
	db, ok := m.Get(clientAddr.IP.String())
	if !ok {
		return
	}
	db.UpdateTimeOut()
	dbMap := db.DB.(map[int]*DataStruct)
	var subclass *DataStruct
	subclass, ok = dbMap[clientAddr.Port]
	if !ok {
		return
	}
	hand(subclass)
	subclass.UpdateTimeOut()

}

func (m *SafeMap) UpdateData(clientAddr *net.UDPAddr, hand func(*DataStruct)) {
	db, ok := m.Get(clientAddr.IP.String())
	var subclass *DataStruct
	var ok_2 bool
	if ok {
		dbMap := db.DB.(map[int]*DataStruct)
		subclass, ok_2 = dbMap[clientAddr.Port]
		if ok_2 {
			hand(subclass)
			subclass.UpdateTimeOut()
			return
		}
	}
	subclass = &DataStruct{}
	hand(subclass)
	old, ok_3 := m.Get(subclass.DB.(*Receive).Carname)
	if ok_3 {

		oldPort := old.DB.(*Receive).RemotePort
		old.DB.(*Receive).Cover(subclass.DB.(*Receive))
		if ok {
			dbMap := db.DB.(map[int]*DataStruct)
			delete(dbMap, oldPort)
			old.UpdateTimeOut()
			dbMap[clientAddr.Port] = old
			return
		} else {
			m.Set(clientAddr.IP.String(), &DataStruct{DB: map[int]*DataStruct{clientAddr.Port: old}})
		}

	} else {
		m.Set(clientAddr.IP.String(), &DataStruct{DB: map[int]*DataStruct{clientAddr.Port: subclass}})
		m.Set(subclass.DB.(*Receive).Carname, subclass)
	}

}
