//import {Bonjour} from "bonjour-service";
import mdns from 'multicast-dns';
import bonjour from 'bonjour-hap';
import dgram  from 'dgram';
import dnsPacket from 'dns-packet';
 
export const initUDPServer = (SERVICE_PORT:number,LOCAL_IP:string,host:string)=>{
    const MDNS_ADDR = '224.0.0.251';
    const MDNS_PORT = 5353;

    const server = dgram.createSocket({
  type: 'udp4',
  reuseAddr: true
});
    //console.log("5353")
    server.on('message', (msg, rinfo) => {
        try {
            // 核心：一行代码完成解析，获取标准DNS结构
            const parsed = dnsPacket.decode(msg);
            console.log('来自 %s:%d 的完整数据包:', rinfo.address, rinfo.port);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (err) {
            console.error('解析失败:', err);
        }
    });
    server.on("error",e=>{
        console.error(e)
    })
    
    server.on('listening', () => {
        const address = server.address();
        server.addMembership(MDNS_ADDR);
        console.log(`start udp server 5353 ${address.address}:${address.port}`);
    });
    server.bind(MDNS_PORT, () => {
        
        console.log('mDNS 监听器已启动...');
    });
    
    return {destroy:()=>{
        server.close();
    }};
};

export const initMulMDNS = (SERVICE_PORT:number,LOCAL_IP:string,host:string)=>{
    const HOSTNAME = 'mgtoy'; // 最终访问 mynode.local
    //const IP =LOCAL_IP;  // 你的Ubuntu IP
    //const PORT =SERVICE_PORT;         // 你的Web服务端口
    // ----------------------------------
    
    const FULL_HOST = `${HOSTNAME}.local`;
    //const SERVICE_TYPE = '_http._tcp.local';
    //const SERVICE_NAME = `${HOSTNAME}.${SERVICE_TYPE}`;
    //const DISCOVERY = '_services._dns-sd._udp.local';
    const mDnsServer = mdns({
  multicast: true,
  interface: '224.0.0.251',  // 监听所有接口
  port: 5353,           // 标准 mDNS 端口
  ttl: 255,             // 合适的 TTL
  loopback: true,
  reuseAddr: true
});
    mDnsServer.on('response', (response, rinfo) => {
        console.log('收到响应:', response,rinfo);
    }); 
    mDnsServer.on('query', (query, rinfo) => {
 
        if (!query.questions) return;
        for (let q of query.questions) {
            if (
            q.name === FULL_HOST  
            ) {
                console.log(q.name,rinfo);
            //sendResponse();
            mDnsServer.respond(
                Object.assign(query,{
                 
                    answers: [
                        { name: FULL_HOST, type: 'A', ttl: 120, data: LOCAL_IP,flush: true },
                    {
                        name: `_http._tcp.${FULL_HOST}`,
                        type: 'SRV',
                        ttl: 120,
                        data: {
                            priority: 10,
                            weight: 0,
                            port: SERVICE_PORT,
                            target: FULL_HOST
                        }
                    },
                    {
                        name: `_http._top.${FULL_HOST}`,
                        type: 'TXT',
                        ttl: 120,
                        data: ['txtvers=1', 'note=Node.js mDNS']
                    }
                    ],
                    additionals: [
                        {
                            name: FULL_HOST,
                            type: 'TXT',
                            ttl: 120,
                            flush: true,
                            data: ['txtvers=1', 'note=test']
                        }
                    ]
                })
            );
            //mDnsServer.query(FULL_HOST, 'A'); 
            break;
            }
        }
         
      
    });
    return mDnsServer;
    /*
    const HOSTNAME = 'my-node-server.local';
    const IP_ADDRESS = '192.168.1.100'; // ⚠️ 请替换为你的 Linux 服务器实际局域网 IP

    mDnsServer.on('query', (query) => {
        query.questions.forEach(question => {
            if (question.name === HOSTNAME && question.type === 'A') {
                mDnsServer.respond({
                    answers: [{
                        name: HOSTNAME,
                        type: 'A',
                        data: IP_ADDRESS,
                        ttl: 120, // 设置一个合适的 TTL 值
                    }]
                });
            }
        });
    });*/
};
 
export const initMDNS = (port:number,LOCAL_IP:string,host:string)=>{
    const bon  =new bonjour();
    bon.publish({ name: host+' Server', type: 'http', port: port ,host});
     
    return bon;
}; 