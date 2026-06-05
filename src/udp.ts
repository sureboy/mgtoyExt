import dgram from 'dgram';
import * as vscode from 'vscode';
import {addrMap,nameMap} from './cache';  
const messageEvent = (server: dgram.Socket,newCar?:(n:any)=>void)=>{
    server.addListener("message",(msg,rinfo)=>{
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
                    //if (conf.newCar){
                    newCar?.(_db);
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
};
export const initUDP = (port:number)=>{
    const server = dgram.createSocket('udp4');
    // 监听当服务器启动并准备好接收消息时触发的事件
    
    server.on('listening', () => {
        const address = server.address();
        console.log(`✅ UDP server is listening on ${address.address}:${address.port}`);
    });

    // 监听错误事件
    server.on('error', (err) => {
        console.error(`❌ Server error:\n${err.stack}`);
        server.close();
    });
    //const PORT = 9002;
    server.on('close',()=>{
        console.log(port,"close");
    });
    try{
        server.bind(port);
        return server;
    }catch(e){
        console.error(e);
    }
};
export const initUDPServer = (conf:{port:number,newCar?:(n:any)=>void} = {port:9002})=>{
    const server = initUDP(conf.port);
    // 监听当服务器启动并准备好接收消息时触发的事件
    if (server){
        messageEvent(server,conf.newCar);
    }
    return server;
    
};

export const startUDPServerFromConfig = ():Promise<dgram.Socket|undefined>=>{
	//const workspaceConfig = vscode.workspace.getConfiguration("mgtoy");
    return new Promise((resolve,reject)=>{
        try{
            vscode.workspace.findFiles('mgtoy.json', 
            null, 1).then(files=>{
                if (files.length === 0) { 
                    reject(); 
                    return;
                } 
                //const u = files[0];
                //console.log(u);
                try{
                    vscode.workspace.fs.readFile(files[0]).then(v=>{
                        const conf = JSON.parse(v.toString());
                        if (conf.udp){
                            resolve(initUDP(conf.udp.port));
                        }
                    });   
                }catch(e){
                    reject(e);
                }                
            });
        }catch(e){
            reject(e);
        }  
        
    });

};
const messageForward = (src: dgram.Socket,des:dgram.Socket)=>{
    src.addListener('message',(msg,rinfo)=>{
        des.send(msg);
    });
    des.addListener('message',(msg,rinfo)=>{
        src.send(msg);
    });
};