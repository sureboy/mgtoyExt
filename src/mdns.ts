//import {Bonjour} from "bonjour-service";
import mdns from 'multicast-dns';
import type {ResponseOutgoingPacket} from 'multicast-dns'
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
        console.error(e);
    });
    
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
const respondA = (HOSTNAME:string ,LOCAL_IP:string):mdns.ResponseOutgoingPacket=>{
     const FULL_HOST = `${HOSTNAME}.local`;  
    return {        
        answers: [
            {
                name: FULL_HOST,
                type: 'A',
                ttl: 120,
                class:"IN",
                flush: true,
                data:  LOCAL_IP
            },
            {
                name: `${LOCAL_IP.split(".").reverse().join(".")}.in-addr.arpa`,
                type: 'PTR',
                ttl: 120,
                class:"IN",
                flush: true,
                data:  FULL_HOST
            }
        ],
        
    } ;
};
const respond  = (HOSTNAME:string,LOCAL_IP:string,SERVICE_PORT:number,SERVICE_TYPE = '_http._tcp.local'):mdns.ResponseOutgoingPacket=>{
    const FULL_HOST = `${HOSTNAME}.local`;
    //const SERVICE_TYPE = '_ws._tcp.local';
    const SERVICE_NAME = `${HOSTNAME}.${SERVICE_TYPE}`;
    const DISCOVERY = '_services._dns-sd._udp.local';
    return {
        
        answers: [
            {name:DISCOVERY,type:'PTR',ttl:4500,class:"IN",data:SERVICE_TYPE,flush:false},
            {name:SERVICE_TYPE,type:'PTR',ttl:4500,class:"IN",data:SERVICE_NAME,flush:false},
            {name:SERVICE_NAME,type:'SRV',ttl:4500,class:"IN",data:{priority:0,weight:0,port:SERVICE_PORT,target:FULL_HOST},flush:true},
            {name:SERVICE_NAME,type:'TXT',ttl:4500,class:"IN",flush:true,data:[]},
        ],
        additionals: [
            {
                name: FULL_HOST,
                type: 'A',
                ttl: 120,
                class:"IN",
                flush: true,
                data:  LOCAL_IP
            }
        ]
    } ;
}

export const initMulMDNS = (SERVICE_PORT:number,LOCAL_IP:string,host:string)=>{
    const HOSTNAME = 'mgtoy'; // 最终访问 mynode.local
    //const IP =LOCAL_IP;  // 你的Ubuntu IP
    //const PORT =SERVICE_PORT;         // 你的Web服务端口
    // ----------------------------------
    
 
    const DISCOVERY = '_services._dns-sd._udp.local';
    const mDnsServer = mdns({});
    mDnsServer.on('response', (response, rinfo) => {
        console.log('收到响应:', response,rinfo);
    }); 
    const run = function (){
        mDnsServer.respond( respondA(HOSTNAME,LOCAL_IP) );
        setTimeout(()=>{
           mDnsServer.respond(  respond(HOSTNAME,LOCAL_IP,SERVICE_PORT, '_ws._tcp.local') );
          mDnsServer.respond(   respond(HOSTNAME,LOCAL_IP,SERVICE_PORT) );
            setTimeout(run,5000);
        },1000);
    };
    //run();
        
 
    mDnsServer.on('query', (query, rinfo) => {
 
        if (!query.questions) return;
        for (let q of query.questions) {
            if (
            q.name.includes(HOSTNAME)   ||
            q.name === DISCOVERY
            ) {
                console.log(query.questions,rinfo);
            //sendResponse();
            mDnsServer.respond(
                 respondA(HOSTNAME,LOCAL_IP)
                 
            );
            //mDnsServer.respond(
            //respond(HOSTNAME,LOCAL_IP,SERVICE_PORT)
            //);
            //mDnsServer.query(FULL_HOST, 'A'); 
            break;
            }
        }
         
      
    });
    return mDnsServer;
 
};
 
export const initMDNS = (port:number,LOCAL_IP:string,host:string)=>{
    const bon  =new bonjour();
    bon.publish({ name: host+' Server', type: 'http', port: port ,host});
     
    return bon;
}; 