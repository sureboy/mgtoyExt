CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o cacheServer_new
scp cacheServer_new root@8.137.106.166:/root/newSite/
ssh root@8.137.106.166 'pkill cacheServer'
ssh root@8.137.106.166 'cd /root/newSite && rm cacheServer.log && rm  cacheServer' 
ssh root@8.137.106.166 'cd /root/newSite  && mv cacheServer_new cacheServer && nohup ./cacheServer  > cacheServer.log 2>&1 ' 
rm cacheServer_new
