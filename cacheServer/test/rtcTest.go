package main

import (
	"cacheServer/WebRtc"
	"fmt"
	"net/http"
)

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 设置允许的来源（生产环境请替换为具体域名，不要用 "*"）
		// 允许跨域的源（开发时可设为 *，生产务必指定具体域名）
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Authorization") // 添加 cache-control

		// 如果是预检请求（OPTIONS），直接返回 204 并结束
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// 非 OPTIONS 请求，继续执行实际的处理函数
		next(w, r)
	}
}
func main() {
	err := http.ListenAndServe(":8088", enableCORS(WebRtc.RtcHttpHandle))
	if err != nil {
		fmt.Println(err)
	}
}
