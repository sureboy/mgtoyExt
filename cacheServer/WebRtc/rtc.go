package WebRtc

import (
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
func RtcHttpHandle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	w.Write([]byte("test" + getClientIP(r)))
	//w.WriteHeader(200)
}
