package main

import (
	"cacheServer/WebRtc"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

var (
	unixAddr = flag.String("addr", "car-unix-socket", "The unix socket address")
	udpAddr  = flag.String("post", ":9002", "udp address ")
	cacheLen = flag.Int("len", 100, "cacheLen")
	cacheMap = NewSafeMap(10)
	//ServerList = []Servers{}
	ApiStructPool = sync.Pool{
		New: func() interface{} {
			//buf := make([]byte, 20)
			return &ApiStruct{Dbs: make([]ApiDB, 0, 100), done: make(chan bool, 1)}
		},
	}
	//wait = sync.WaitGroup{}
)

type ApiStruct struct {
	Key  string  `json:"key"`
	Dbs  []ApiDB `json:"dbs"`
	done chan bool
}

func (a *ApiStruct) write(w http.ResponseWriter) {
	if len(a.Dbs) == 0 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
	err := json.NewEncoder(w).Encode(a)
	if err != nil {
		log.Println(err)
	}
}

type ApiDB struct {
	Url     string `json:"url"`
	Uri     string `json:"uri"`
	Name    string `json:"name"`
	TimeOut int64  `json:"timeOut"`
	IsNat   bool   `json:"isNat"`
}

func NewApiStruct() *ApiStruct {
	a := ApiStructPool.Get().(*ApiStruct)
	a.Dbs = a.Dbs[:0]
	return a
}
func (a *ApiStruct) Clean() {
	ApiStructPool.Put(a)
}

func getClientIP(r *http.Request) string {
	// 1. 优先从 X-Forwarded-For 获取（可能有多个 IP）
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		ips := strings.Split(xForwardedFor, ",")
		clientIP := strings.TrimSpace(ips[0]) // 第一个 IP 是客户端
		return clientIP
	}

	// 2. 尝试从 X-Real-IP 获取
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	// 3. 最后回退到 RemoteAddr
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}
func init() {
	flag.Parse()
	cacheMap.SetCacheMaxLen(*cacheLen)
	AddExcludedPath("/rtc", 10, WebRtc.RtcHttpHandle)
	AddExcludedPath("/api", 10, func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		ctx := r.Context()
		urlQuery := r.URL.Query()
		//log.Println(urlQuery)
		ip := getClientIP(r)
		resdb := NewApiStruct()
		defer resdb.Clean()
		resdb.Key = ip
		if urlQuery.Has("name") {
			resdb.Key = urlQuery.Get("name")
		}
		//log.Println(resdb)
		msg := 255
		ismsg := urlQuery.Has("msg")
		if ismsg {
			var err error
			msg, err = strconv.Atoi(urlQuery.Get("msg"))

			if err != nil {
				w.WriteHeader(http.StatusNotFound)
				return
			}

			if (msg & 0xF0) == 0 {
				msg = msg | 0xF0
			}

		}

		pack := NewTaskPacket()
		//wait.Add(1)
		pack.handle = func() {
			dbCache, ok := cacheMap.Get(resdb.Key)
			if ok {

				rec, ok := dbCache.DB.(*Receive)
				if ok {
					if ismsg {
						//pack1 := NewTaskPacket()
						//pack1.handle = func() {
						//cachedb := dbs[k]
						pack.UpdateMsg(dbCache.Num, byte(msg))
						pack.SetUDPAddr(&net.UDPAddr{IP: rec.RemoteIP, Port: rec.RemotePort})
						//dbCache.SetNum(dbCache.getNextNum())
						//}
						//pack1.AddWorkChan()
					}

					//dbCache = nil
					//} else {

					//timeOut := dbCache.IsTimeOut(20)
					//isNat := ip == rec.LocalIP.String()

					resdb.Dbs = append(resdb.Dbs, ApiDB{
						Name:    rec.Carname,
						Url:     fmt.Sprintf("/api?name=%s&msg=", rec.Carname),
						Uri:     fmt.Sprintf("http://%s", rec.LocalIP),
						TimeOut: dbCache.GetTimeOut(),
						IsNat:   ip == rec.LocalIP.String(),
					})
				} else {
					dbs, ok := dbCache.DB.(map[int]*DataStruct)
					if ok {
						for _, v := range dbs {
							rec_ := v.DB.(*Receive)

							if ismsg {
								if pack.addr == nil {
									pack.UpdateMsg(v.Num, byte(msg))
									pack.SetUDPAddr(&net.UDPAddr{IP: rec_.RemoteIP, Port: rec_.RemotePort})

								} else {
									pack1 := NewTaskPacket()
									pack1.handle = func() {
										//cachedb := dbs[k]

										pack1.UpdateMsg(v.Num, byte(msg))
										pack1.SetUDPAddr(&net.UDPAddr{IP: rec_.RemoteIP, Port: rec_.RemotePort})
										//v.SetNum(v.getNextNum())
									}

									pack1.AddWorkChan()
								}

							}

							resdb.Dbs = append(resdb.Dbs, ApiDB{
								Name:    rec_.Carname,
								Url:     fmt.Sprintf("/api?name=%s&msg=", rec_.Carname),
								Uri:     fmt.Sprintf("http://%s", rec_.LocalIP),
								TimeOut: v.GetTimeOut(),
								IsNat:   ip == rec_.LocalIP.String(),
							})
						}
					}
				}

			}
			resdb.done <- true

			//wait.Done()
		}

		pack.AddWorkChan()
		select {
		case <-resdb.done:
			resdb.write(w)
			return
		case <-ctx.Done():
			return
		case <-time.After(time.Millisecond * 100):
			http.Error(w, "", http.StatusRequestTimeout)

		}

		//wait.Wait()

		//w.Write([]byte("Local handling for " + r.URL.Path))
		//let name = url.searchParams.has("name")?url.searchParams.get("name")!:localip
		//let msg = url.searchParams.get("msg") || 255
	})
}

/*
	type Servers interface {
		RunServer(addr string, handle func(listenConn interface{}))
		HandleMsg(listenConn interface{}, cache *SafeMap)
	}
*/
func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g, _ := errgroup.WithContext(ctx)
	RunHttpServer(g.Go)
	g.Go(func() error {
		UnixgramServer(fmt.Sprintf("/tmp/%v", *unixAddr), func(conn interface{}) {
			HandUnixMsg(conn, cacheMap)
		})
		return nil
	})
	g.Go(func() error {
		err := UDPServer(*udpAddr, func(conn interface{}) {
			//log.Println("udp")
			g.Go(func() error {
				WorkerRec(conn, cacheMap)
				return nil
			})
		})
		if err != nil {
			log.Println(err)
		}
		return err
	})
	// 解析UDP地址

	if err := g.Wait(); err != nil {
		log.Printf("服务器错误: %v", err)
	}

	log.Println("服务器已关闭")

}
