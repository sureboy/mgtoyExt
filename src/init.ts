import * as vscode from 'vscode';
import {RunHttpServer,defaultSerConfig} from './http';
import * as http from 'http'; 
import type { HttpConfigType, SerConfig } from './http';
import {getLocalIp} from './util';
//import {initWebSocket} from './webSocket';
import {initUDPServer} from './udp'; 
import * as path from 'path';
import  {
  RTCPeerConnection ,
  RTCDataChannel ,
  RTCIceCandidate,
  RTCSessionDescription,
  signatures
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
export const workspaceConfig = vscode.workspace.getConfiguration("mgtoy"); 
const serverList:{
    dispose(): any;
}[] = [defaultSerConfig]; 
export const stopServer = ()=>{
     
    //defaultSerConfig.dispose();  
    serverList.forEach(v=>{
        v.dispose();
    });

};
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
const initRun = (ser:SerConfig )=>{ 
    try{
        const localIP = getLocalIp(); 
        const {Bar,menu} = initBar(ser.httpPort,localIP );  
        console.log("init bar"); 
        serverList.push(Bar,menu );
    }catch(e){
        console.error(e);
    }
};
export const startServer = (context: vscode.ExtensionContext,rootPath: vscode.Uri,back?:(ser:SerConfig)=>void)=>{
    //console.log(context);
    const config = vscode.workspace.getConfiguration("mgtoy");
    const udpServer = initUDPServer({port:config.get("udpPort") ||9002,newCar:(n)=>{
        pool.getAllConnectionIds().forEach(id=>{
            pool.getConnection(id)?.dc.send(JSON.stringify({
                name:n.DB.Carname,
                update:n.Update,
                type:"udp"}));
        });
    }});
    if (udpServer){
        serverList.push({dispose:()=>{
            udpServer.close();
        }});
    } 
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
            "/offer":(resdb:(db:any)=>void)=>{
                handleWebRtcConn(resdb,dc=>{
                    openDataChannelEvent(dc);
                    dc.addEventListener('open',()=>{ 
                        for (const v of nameMap.entries()){
                            dc.send(JSON.stringify({
                                name:v[1].DB.Carname,
                                update:v[1].Update,type:"udp"}));
                        } 
                    });
                    dc.addEventListener('message',
                     (e)=>{
                        const obj = JSON.parse(e.data as string);
                        if (obj.id){
                            const conn = pool.getConnection(obj.id);
                            if (conn){
                                obj.id = dc.label;
                                conn.dc.send(JSON.stringify(obj));
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
                });
            }
        }
    };  
    RunHttpServer( conf   ,(ser:SerConfig)=>{
        initRun(ser);
        if (back){
            back(ser);
        }
    });
};
const handleWebRtcConn = (send:(signaling: signalingStruct)=>void,DataChannel:(dc:RTCDataChannel)=>void)=>{
    let isSend = false;            
    initWebRtcClient(({signaling})=>{ 
        if (signaling.offer && !isSend){
            send(signaling); 
            isSend=true;
        }                        
    }).then(({signaling,dc,pc})=>{
        DataChannel(dc);
 
        if (signaling.ICEList.length>0 && !isSend ){
            send(signaling); 
            isSend=true;
        }
    }); 
    return;
};

