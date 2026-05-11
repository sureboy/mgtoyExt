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

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g, _ := errgroup.WithContext(ctx)
	g.Go(func() error {
		err := http.ListenAndServe(":8088", http.HandlerFunc(WebRtc.RtcHttpHandle))
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
