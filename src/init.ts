import * as vscode from 'vscode';
import {
    RunHttpServer,
    //defaultSerConfig
} from './http';
import dgram from 'dgram';
//import * as http from 'http'; 
import {createWebRtcConnWithUDP} from './webRtcHost';
import type { HttpConfigType, SerConfig } from './http';
import {getLocalIp} from './util';
//import {initWebSocket} from './webSocket';
import {initUDPServer} from './udp'; 
import * as path from 'path';
import  {
  RTCPeerConnection ,
  RTCDataChannel ,
  //RTCIceCandidate,
  //RTCSessionDescription,
  //signatures
  } from 'werift';
import {initBar} from './Bar'; 
import type {Socket} from 'dgram';
import {pool,
    initWebRtcClient,
    addRemoteAnswer,
    webRtcRouterHandle,
    openDataChannelEvent
} from './webrtc'; 
import type {signalingStruct} from './webrtc';
import {nameMap} from './cache';  
import {sendFileWithStream} from './sendFileWithStream';
import { connType } from './webRTCPool';
export const workspaceConfig = vscode.workspace.getConfiguration("mgtoy"); 
/*
const serverList:{
    dispose(): any;
}[] = [defaultSerConfig]; 
*/
/*
export const stopServer = ()=>{
     
    //defaultSerConfig.dispose();  
    serverList.forEach(v=>{
        v.dispose();
    });

};*/
const initConfCallBack = (udpServer: Socket)=>{
    return (msgObj:{name:string,msg:string})=>{
        if (msgObj.name==="local"){
            const list = [];
            for (const v of nameMap.entries()){
                list.push({name:v[1].DB.Carname,update:v[1].Update,type:"udp"});
            }
            return list;
        }
        const db = nameMap.get(msgObj.name);  
        if (db){
            console.log("api get",db,msgObj);
            try{
                udpServer.send(new Uint8Array([db.Num,Number(msgObj.msg||0)|0xF0 ]),db.DB.RemotePort,db.DB.RemoteIP,err=>{
                    if (err){
                        console.error(err);
                    }
                }); 
            }catch(e){
                console.error(e);
            }
            
            //return db;
        }
        return {name:db?.DB.Carname,update:db?.Update,type:"udp"};
    };    
};
const initRunBar = (ser:SerConfig )=>{ 
    try{
        const localIP = getLocalIp(); 
        return initBar(ser.httpPort,localIP );  
        //console.log("init bar"); 

        //serverList.push(Bar,menu );
    }catch(e){
        console.error(e);
    }
};
const WebrtcConnOpen = (
    dc: RTCDataChannel,
    pc: RTCPeerConnection,rootPath:string,udpServer?: Socket )=>{
    for (const v of nameMap.entries()){
        dc.send(JSON.stringify({
            name:v[1].DB.Carname,
            update:v[1].Update,type:"udp"}));
    }
    pc.ondatachannel=(ev)=>{
        console.log(ev.channel.label);
        ev.channel.onclose = ()=>{
            console.log("close",ev.channel.label);
        };
        const fn = vscode.Uri.file(path.join(path.dirname(rootPath ),ev.channel.label));
        vscode.workspace.fs.stat(fn).then(file=>{ 
            sendFileWithStream(fn.fsPath,ev.channel).then(n=>{
                console.log(n,file.size);
                ev.channel.send("end"); 
                //ev.channel.close(); 
            }); 
        }); 
    };
    dc.send(JSON.stringify({ type:"file",name:path.basename(rootPath)})); 
    dc.addEventListener('message',
        (e)=>{
        const obj = JSON.parse(e.data as string);
        if (obj.id){
            const conn = pool.getConnection(obj.id);
            if (conn){
                obj.id = dc.label;
                conn.dc?.send(JSON.stringify(obj));
            }
        }
        if (obj.name){
            const db = nameMap.get(obj.name);  
            if (db){ 
                try{
                    udpServer?.send(new Uint8Array([db.Num,Number(obj.msg||0)|0xF0 ]),db.DB.RemotePort,db.DB.RemoteIP,err=>{
                        if (err){
                            console.error(err);
                        }
                    }); 
                }catch(e){
                    console.error(e);
                } 
                dc.send(JSON.stringify({name:db?.DB.Carname,update:db?.Update,type:"udp"}));
            }
        }
        /*
        //setRemoteRTCMsg(obj,{pc,dc:dataChannel});
        if (webRtcRouterHandle(obj,dc)){ 
            return;
        } 
        if (!udpServer){
            return;
        }
        const db = initConfCallBack(udpServer)(obj);
        if (db){
            if ( Array.isArray(db)){
                db.forEach(v=>{
                    dc.send(JSON.stringify(v));
                });
                
            }else{
                dc.send(JSON.stringify(db));
            }                                
        }*/
    });

};
export const startServer = (context: vscode.ExtensionContext,rootPath: vscode.Uri,udpServer? :dgram.Socket,back?:(ser:SerConfig)=>void)=>{
    //console.log(context);
    const config = vscode.workspace.getConfiguration("mgtoy");
    /*
    const udpServer = initUDPServer({port:config.get("udpPort") ||9002,newCar:(n)=>{
        pool.getAllConnectionIds().forEach(id=>{
            pool.getConnection(id)?.dc?.send(JSON.stringify({
                name:n.DB.Carname,
                update:n.Update,
                type:"udp"}));
        });
    }});*/
    /*
    if (udpServer){
        //serverList.push({dispose:()=>{
            udpServer.close(openDataChannelEvent);
        //}});
    } */
    const conf:HttpConfigType = {
        //udpPort:config.get("udpPort") ||9002,
        webUI:vscode.Uri.joinPath(context.extensionUri,config.get("webUI")||"webUI").fsPath,
        port:config.get("tcpPort") || 3000, 
        rootPath:rootPath.fsPath,
        //callBack :udpServer?initConfCallBack(udpServer):console.log,
        handlePostReq:{
            
            "/answer":(postDB:any,resdb:(db:any)=>void)=>{
                resdb({}); 
                addRemoteAnswer(postDB).then(val=>{
                    //resdb({msg:val}); 
                });
            },
            "/find":(postDB:any,resdb:(db:any)=>void)=>{
                //res.end(JSON.stringify(Object.fromEntries(nameMap)));
                resdb(Object.fromEntries(nameMap));
            },
            "/api":(postDB:any,resdb:(db:any)=>void)=>{
                if (!udpServer){
                    resdb({});
                    return;
                }
                resdb(initConfCallBack(udpServer)(postDB));
            },
        },
        handleGetReq:{
            "/conn":(uri,resdb:(db:any)=>void)=>{
                const url = uri.searchParams.get("url")||"https://mgtoy.cn/control";
                //const host = uri.searchParams.get("host")||"192.168.1.8:9003";
                const udpHost = uri.searchParams.get("host")||"zaddone.com:9003";//"192.168.1.8:9003";
                const webHost =uri.searchParams.get("web")|| "https://www.zaddone.com/rtc";
                //const id = Date.now().toString(32).slice(4);
                createWebRtcConnWithUDP((conn)=> 
                    resdb({
                        url:`${url}#${encodeURIComponent(JSON.stringify({connid:conn.id,host:webHost}))}`,
                        code:302}),conn=>{
                            WebrtcConnOpen(
                                conn.dc!,
                                conn.pc,
                                conf.rootPath,
                                udpServer);
                        } ,true,udpHost);
            },
            "/offer":(uri,resdb:(db:any)=>void)=>{
                handleWebRtcConn(resdb,({dc,pc})=>{
                    openDataChannelEvent(dc);
                    dc.addEventListener('open',()=>{ 
                        WebrtcConnOpen(dc,pc,conf.rootPath,udpServer);
                    });
                    /*
                    dc.addEventListener('message',
                     (e)=>{
                        const obj = JSON.parse(e.data as string);
                        if (obj.id){
                            const conn = pool.getConnection(obj.id);
                            if (conn){
                                obj.id = dc.label;
                                conn.dc?.send(JSON.stringify(obj));
                            }
                        }
                        if (obj.name){
                            const db = nameMap.get(obj.name);  
                            if (db){ 
                                try{
                                    udpServer?.send(new Uint8Array([db.Num,Number(obj.msg||0)|0xF0 ]),db.DB.RemotePort,db.DB.RemoteIP,err=>{
                                        if (err){
                                            console.error(err);
                                        }
                                    }); 
                                }catch(e){
                                    console.error(e);
                                } 
                                dc.send(JSON.stringify({name:db?.DB.Carname,update:db?.Update,type:"udp"}));
                            }
                        }
                    
                    });*/
                });
            }
        }
    };  
    RunHttpServer( conf   ,(ser:SerConfig)=>{
        ser.menu = initRunBar(ser);
        if (back){
            back(ser);
        }
    });
};
const handleWebRtcConn = (send:(signaling: signalingStruct)=>void,DataChannel:(obj:{dc:RTCDataChannel,pc: RTCPeerConnection})=>void)=>{
    let isSend = false;            
    initWebRtcClient(({signaling})=>{ 
        if (signaling.offer && !isSend){
            send(signaling); 
            isSend=true;
        }                        
    }).then(({signaling,dc,pc})=>{
        DataChannel({dc,pc});
 
        if (signaling.ICEList.length>0 && !isSend ){
            send(signaling); 
            isSend=true;
        }
    }); 
    return;
};

