import * as vscode from 'vscode';
import {RunHttpServer,defaultSerConfig} from './http';
import type { HttpConfigType } from './http';
import {getLocalIp} from './util';
import {initWebSocket} from './webSocket';
import {initUDPServer} from './udp';
import {nameMap} from './cache';
import { initMDNS } from './mdns';
import {initBar} from './Bar'; 
export const workspaceConfig = vscode.workspace.getConfiguration("mgtoy"); 
const serverList:{
    dispose(): any;
}[] = []; 
export const stopServer = ()=>{
     
    defaultSerConfig.close();  
    serverList.forEach(v=>{
        v.dispose();
    });
};
export const startServer = ( conf:HttpConfigType)=>{
    
    RunHttpServer(conf,ser=>{
        console.log(ser); 
        const bon = initMDNS(ser.httpPort);
        const udpServer = initUDPServer({port:9002});
        conf.callBack = (msgObj:{name:string,msg:string})=>{
            //  const msgObj = (obj as {name:string,msg:string})
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
                
                
            }
            return db;
        };
        const Bar = initBar(); 
        
        
        const wss = initWebSocket({server:ser.Server,callBack:conf.callBack});
        serverList.push({dispose:()=>{
            bon.destroy();
            udpServer.close();
            Bar.hide();
            Bar.dispose();
            wss.close(err=>{
                if (err){
                    console.error(err);
                }
            });
        }});
         
        
    });
};

