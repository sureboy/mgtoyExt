import * as vscode from 'vscode';
import {RunHttpServer,defaultSerConfig} from './http';
import type { HttpConfigType, SerConfig } from './http';
import {getLocalIp} from './util';
//import {initWebSocket} from './webSocket';
import {initUDPServer} from './udp';
import {nameMap} from './cache';
import * as path from 'path';
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
    //console.log(ser); 
    //initWebRtcClient()
    
    //const bon = initMDNS(ser.httpPort,localIP,"mgtoy.local"); 
    try{
        const localIP = getLocalIp(); 
        const {Bar,menu} = initBar(ser.httpPort,localIP );  
        console.log("init bar");
        //const wss = initWebSocket({server:ser.Server,callBack:ser.conf.callBack});
        serverList.push(Bar,menu );
    }catch(e){
        console.error(e);
    }
};
export const startServer = (context: vscode.ExtensionContext,rootPath: vscode.Uri,back?:(ser:SerConfig)=>void)=>{
    //console.log(context);
    const config = vscode.workspace.getConfiguration("mgtoy");
    const udpServer = initUDPServer({port:config.get("udpPort") ||9002});
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
        callBack :udpServer?initConfCallBack(udpServer):console.log
    }; 
    
    RunHttpServer( conf   ,(ser:SerConfig)=>{
        initRun(ser);
        if (back){
            back(ser);
        }
    });
};

