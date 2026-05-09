package WebRtc

import (
	"cacheServer/room"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
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
	cache := room.ReadCache(id)
	if cache == nil {
		http.Error(w, "Unauthorized:"+id, http.StatusUnauthorized)
		return
	}
	//var chann chan string
	write := func(db string) {

		_, err := fmt.Fprintf(w, "data: %s\n\n", db)
		if err != nil {
			log.Printf("Write error: %v", err)
			return
		}
		flusher.Flush()
	}
	if query.Get("create") == "true" {

		cache.Create = write
	} else {
		cache.SetAppend(write)
	}
	ticker := time.NewTicker(5 * time.Second)
	defer func() {
		ticker.Stop()
		room.CleanCache(cache)
	}()
	for {
		select {
		case <-ctx.Done():
			// 客户端断开连接，退出循环
			log.Println("Client disconnected")
			return
		case test := <-ticker.C:
			write(test.Format(time.RFC3339))
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

	db := room.NewPostDB()
	if err := json.NewDecoder(r.Body).Decode(db); err != nil {
		http.Error(w, fmt.Sprint(err), http.StatusBadRequest)
		return
	}
	httpHandleEnd(w)
	if db.Id == "" {
		db.Id = getClientIP(r)
	}

	c := db.HandleMsg()
	if db.Create {
		return
	}
	msglist, err := json.Marshal(c.Msg())
	if err == nil && msglist != nil {
		w.Write(msglist)
	}

}
