package main

import (
	"cacheServer/WebRtc"
	"cacheServer/udp"
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"

	"golang.org/x/sync/errgroup"
)

var (
	udpAddr = flag.String("post", ":9003", "udp address ")
)

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 设置允许的来源（生产环境请替换为具体域名，不要用 "*"）
		// 允许跨域的源（开发时可设为 *，生产务必指定具体域名）
		w.Header().Set("Access-Control-Allow-Origin", "*")
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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g, _ := errgroup.WithContext(ctx)
	g.Go(func() error {
		err := http.ListenAndServe(":8088", enableCORS(WebRtc.RtcHttpHandle))
		if err != nil {
			fmt.Println(err)
		}
		return err
	})
	g.Go(func() error {
		err := udp.UDPServer(*udpAddr)
		if err != nil {
			log.Println("err", err)
		}
		return err
	})
	if err := g.Wait(); err != nil {
		log.Printf("服务器错误: %v", err)
	}
}
