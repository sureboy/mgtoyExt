import * as vscode from 'vscode';
import {RunHttpServer,defaultSerConfig} from './http';
import type { HttpConfigType, SerConfig } from './http';
import {getLocalIp} from './util';
//import {initWebSocket} from './webSocket';
import {initUDPServer} from './udp';
import {nameMap} from './cache';
//import { initWebRtcClient } from './webrtc';
//import {initMulMDNS,initUDPServer as initMDNS} from './mdns';
import {initBar} from './Bar'; 
import type {Socket} from 'dgram';
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
                list.push(v[1]);
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
        return db;
    };    
};
const initRun = (ser:SerConfig)=>{
    //console.log(ser); 
    //initWebRtcClient()
    const localIP = getLocalIp();
    //const bon = initMDNS(ser.httpPort,localIP,"mgtoy.local"); 
    const Bar = initBar(ser.httpPort,localIP);  
    //const wss = initWebSocket({server:ser.Server,callBack:ser.conf.callBack});
    serverList.push(Bar );
};
export const startServer = (context: vscode.ExtensionContext)=>{
    console.log(context);
    const config = vscode.workspace.getConfiguration("mgtoy");
    const udpServer = initUDPServer({port:config.get("udpPort") ||9002});
    serverList.push({dispose:()=>{
        udpServer.close();
    }});
    const conf:HttpConfigType = {
        //udpPort:config.get("udpPort") ||9002,
        port:config.get("tcpPort") || 3000,
        rootPath:vscode.Uri.joinPath(context.extensionUri,config.get("webUI")||"webUI").fsPath,
        callBack : initConfCallBack(udpServer)
    }; 
    
    RunHttpServer( conf   ,initRun);
};

