package WebRtc

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
)

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

type PostDB struct {
	Id  string `json:"id"`
	Msg string `json:"msg"`
	//Create bool           `json:"create"`
	//Ip    string `json:"ip"`
	//cache any
}

func httpHandleEnd(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}
func RtcSSEHandle(w http.ResponseWriter, r *http.Request) {
	//fmt.Println(r)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// 禁用 GOPROXY 缓冲（可选，某些环境下需要）
	w.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}
	ctx := r.Context()
	query := r.URL.Query()
	id := query.Get("id")
	if id == "" {
		id = getClientIP(r)
	}
	cache := CacheID.read(id)
	if cache == nil {
		http.Error(w, "Unauthorized:"+id, http.StatusUnauthorized)
		return
	}
	var chann chan string
	if query.Get("create") == "" {
		chann = cache.append
	} else {
		chann = cache.create
	}
	//ticker := time.NewTicker(1 * time.Second)
	//defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			// 客户端断开连接，退出循环
			log.Println("Client disconnected")
			return
		case t := <-chann:
			// 发送消息格式: "data: 内容\n\n"
			msg := fmt.Sprintf("data: %s\n\n", t)
			_, err := w.Write([]byte(msg))
			if err != nil {
				log.Printf("Write error: %v", err)
				return
			}
			flusher.Flush()

		}
	}
}
func RtcHttpHandle(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		RtcSSEHandle(w, r)
		fmt.Println("sse end")
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var db PostDB
	if err := json.NewDecoder(r.Body).Decode(&db); err != nil {
		http.Error(w, fmt.Sprint(err), http.StatusBadRequest)
		return
	}
	if db.Id == "" {
		db.Id = getClientIP(r)
	}
	httpHandleEnd(w)
	if r.URL.Query().Get("create") == "" {
		roomAppend(w, &db)
	} else {
		roomCreate(w, &db)
	}
}
func roomAppend(w http.ResponseWriter, db *PostDB) {
	cache := CacheID.read(db.Id)
	if cache == nil {
		return
	}
	cache.append <- db.Msg
}
func roomCreate(w http.ResponseWriter, db *PostDB) {

	cache := CacheID.read(db.Id)
	if cache == nil {
		cache = CreateDBChan()
		CacheID.write(db.Id, cache)
	}
	cache.create <- db.Msg
}
