import dgram from 'dgram';
import {addrMap,nameMap} from './cache'; 
export const initUDPServer = (conf = {port:9002})=>{
    const server = dgram.createSocket('udp4');
    // 监听当服务器启动并准备好接收消息时触发的事件
    server.on('listening', () => {
        const address = server.address();
        console.log(`✅ UDP server is listening on ${address.address}:${address.port}`);
    });
    server.on('message', (msg, rinfo) => {
        const k = `${rinfo.address}:${rinfo.port}`;
        console.log(k,msg.toString());
        const db = addrMap.get(k);
        const sendMsg =  [msg[0]];
        switch (msg.length) {
            case 1:
                if (db){
                    db.Update = Date.now();
                    db.Num = msg[0];
                }else{    
                    sendMsg.push(255); 
                }               
                break;
            case 12: 
                const _db ={
                    Update:Date.now(),
                    Num:msg[0],
                    DB:{
                        LocalIP:new Uint8Array(msg.subarray(8).map(v=>v^255)),
                        RemoteIP:rinfo.address,//new Uint8Array(rinfo.address.split(".").map(v=>Number(v))),
                        Carname:msg.subarray(2,8).toString(),
                        RemotePort:rinfo.port,
                        Control: msg[1],
                    }};
                //console.log(_db);
                if (db){
                    Object.assign(db,_db);
                }else{
                    addrMap.set(k,_db) ;
                    nameMap.set(_db.DB.Carname,_db);
                }
                break; 
            default:
                console.log(msg.length,msg.toString());
        }
        server.send(new Uint8Array(sendMsg),rinfo.port, rinfo.address,err=>{
            if (err){
                console.error(err);
            }
        });
        
    });

    // 监听错误事件
    server.on('error', (err) => {
        console.error(`❌ Server error:\n${err.stack}`);
        server.close();
    });
    //const PORT = 9002;
    server.bind(conf.port);
    return server;
};