package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/quic-go/quic-go/http3"
	"golang.org/x/crypto/acme/autocert"
	"golang.org/x/sync/errgroup"
)

var (
	domainPortMap = map[string]*url.URL{}

	excludedPathMap = map[string]func(http.ResponseWriter, *http.Request){}
	//excludedPathMapFunc = map[string]chan func(){}
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	g, _ := errgroup.WithContext(ctx)
	RunHttpServer(g.Go)
	if err := g.Wait(); err != nil {
		log.Printf("服务器错误: %v", err)
	}

}
func AddExcludedPath(p string, workMax int, f func(http.ResponseWriter, *http.Request)) {

	excludedPathMap[p] = f
	/*
		workChan := make(chan func(), workMax)
		excludedPathMapFunc[p] = workChan
		go func() {
			for f := range workChan {
				f()
			}
		}()
	*/
}
func singleJoiningSlash(a, b string) string {
	aslash := strings.HasSuffix(a, "/")
	bslash := strings.HasPrefix(b, "/")
	switch {
	case aslash && bslash:
		return a + b[1:]
	case !aslash && !bslash:
		return a + "/" + b
	}
	return a + b
}
func getDomains() []string {
	domains := make([]string, 0, len(domainPortMap))
	for k := range domainPortMap {
		domains = append(domains, k)
	}
	return domains
}
func newReverseProxy() *httputil.ReverseProxy {
	story, _ := url.Parse("http://localhost:3000") // 替换为你的后端地址
	mgtoy, _ := url.Parse("http://localhost:3001") // 替换为你的后端地址
	domainPortMap["zaddone.com"] = story
	domainPortMap["www.zaddone.com"] = story
	domainPortMap["mgtoy.zaddone.com"] = mgtoy

	return &httputil.ReverseProxy{
		Director: func(req *http.Request) {

			host := strings.Split(req.Host, ":")[0]
			targetURL, ok := domainPortMap[host]
			if !ok {
				return
			}
			fmt.Println(req.URL.Path)
			//targetURL, _ := url.Parse(target)
			//req.Header.Set("X-Forwarded-For", getClientIP(req))
			req.URL.Scheme = targetURL.Scheme
			req.URL.Host = targetURL.Host
			req.URL.Path = singleJoiningSlash(targetURL.Path, req.URL.Path)
		},
	}
}

func ExcludePathsMiddleware() http.Handler {
	proxy := newReverseProxy()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		//for _, path := range excludedPaths {
		//	if strings.HasPrefix(r.URL.Path, path) {
		w.Header().Add("Alt-Svc", `h3=":443"; ma=86400`)
		//path := strings.Split(r.URL.Path, "?")[0]
		//log.Println(path)
		hand, ok := excludedPathMap[strings.Split(r.URL.Path, "?")[0]]
		if ok {
			//excludedPathMapFunc[path] <- func() {
			hand(w, r)
			//}

			return
		}

		//excludedPathhandleFunc(w, r)

		//	}
		//}
		// 其他请求走代理
		proxy.ServeHTTP(w, r)
	})
}
func RunHttpServer(runServer func(func() error)) {
	// 定义后端服务地址（HTTP）

	//proxy := httputil.NewSingleHostReverseProxy(target)
	proxy := ExcludePathsMiddleware()
	certManager := autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(getDomains()...),
		Cache:      autocert.DirCache("certs"), // 证书缓存目录
	}
	server := &http.Server{

		Addr:    ":443",
		Handler: proxy,
		//MaxConnsPerHost:   100,
		//Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//	w.Write([]byte("Hello, Let's Encrypt!"))
		//}),
		TLSConfig: &tls.Config{
			GetCertificate: certManager.GetCertificate,
			MinVersion:     tls.VersionTLS12, // 禁用旧版 TLS
			NextProtos:     []string{"h3", "h2", "http/1.1"},
		},
	}

	quicServer := &http3.Server{

		Addr: ":443",
		TLSConfig: &tls.Config{
			GetCertificate: certManager.GetCertificate,
			NextProtos:     []string{"h3", "h2", "http/1.1"},
		},
		Handler: proxy,
	}
	runServer(func() error {
		log.Println("HTTP/1服务器启动")
		return http.ListenAndServe(":80", certManager.HTTPHandler(nil))
	})
	runServer(func() error {
		log.Println("HTTP/2服务器启动")
		return server.ListenAndServeTLS("", "")
	})
	runServer(func() error {
		log.Printf("HTTP/3服务器启动，监听 %s", quicServer.Addr)
		return quicServer.ListenAndServe()
	})

}
