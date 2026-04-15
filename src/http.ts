import * as http from 'http'; 
import * as path from 'path'; 
import {RTCDataChannel} from 'werift';
//import * as   WebSocket  from 'ws' ;
import {initWebRtcClient,addRemoteAnswer } from './webrtc';
//import type {signalingStruct} from './webrtc';
import * as fs from "fs";

import {addrMap,nameMap} from './cache'; 

const routerSignaling = new Map<string,{answerDataChannel?:RTCDataChannel,offerDataChannel:RTCDataChannel,msg:any[]}>();
//import { buffer } from 'stream/consumers';
export type HttpConfigType = {
    //src:string, 
    //udpPort:number,
    port:number,
    //http.Server
    rootPath:string,
    callBack:(obj:any)=>any
    //srcPath:string,
    //serverIP:string[]
    //includeImport:{ [key: string]: string }
} 
export type SerConfig = {
    //clientwsMap:Set< WS.WebSocket >,
    //PostMessageSet:PostMessageSetType,
    //name:string,
    //wss?: WebSocket.Server
    httpPort:number,
    //isConn:()=>boolean,
    Server?: http.Server
    conf:HttpConfigType ,
    //HandleMsgMap:Map<string,HandMessageFuncMap>,
    //wss?:WebSocketServer
    /*
    config?:{
        extensionUri:string,
        indexHtml:string,
        name:string
    }*/
}
export const defaultSerConfig:
{ser?:SerConfig|undefined,
    dispose:()=>void } = 
{ 
    dispose:function(){
    const server = this.ser?.Server;
    if (!server){
        return;
    }
    server.close(() => {
        console.log('All connections closed, exiting.');
        //process.exit(0);
    });

    // 2. 立即关闭空闲连接（可选，减少等待时间）
    server.closeIdleConnections();

    // 3. 设置超时强制退出（避免因活动连接永远不关闭而卡住）
    setTimeout(() => {
        console.error('Forced shutdown: closing all connections.');
        server.closeAllConnections();
        this.ser=undefined;
        //process.exit(1);
    }, 10000); 
}};
const contentType:{ [key: string]: string } = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wasm':'application/wasm',
};
const httpindexHtml = ()=>{
return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" /> 
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>  solidJScad </title> 
        <link rel="stylesheet" href="/assets/main.css"> 
    </head>
    <body>    
    <script  >
 
 </script>    
    <div id="app" ></div>   
<script type="module" src="/main.js"> </script>    
    </body>
</html>`;
};
const readBinaryFile = (filePaths:string,contentType:string,res:http.ServerResponse<http.IncomingMessage> & {
    req: http.IncomingMessage;
} ) =>{
    try{
         fs.stat(filePaths, (err, stats) => {
            if (err || !stats.isFile()) {
                res.statusCode = 404;
                res.end('File not found');
                return;
            }
             res.setHeader('Content-Type', contentType || 'text/plain');
      // 设置 Content-Length，避免分块传输时长度未知
      res.setHeader('Content-Length', stats.size);
        //binary
        const stream = fs.createReadStream(filePaths);
        stream.pipe(res);
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
         }); 
    }catch(e){
        console.error(e);
        res.writeHead(404);
        res.end();
    }
};
function createHttpServer   (conf: HttpConfigType   ) {   
    //let dataChannel: RTCDataChannel|undefined = undefined;
    return http.createServer((req, res) => { 
        if (req.url==="/"){
            res.setHeader("Access-Control-Allow-Origin","*");
            res.writeHead(200, { 'Content-Type': 'text/html' });
            let indexHtml = "";
            //console.log("index path",conf.rootPath);
            try{
                indexHtml = fs.readFileSync(path.join(conf.rootPath,"index.html"),{encoding:'utf8'}) ;
            }catch(e){
                indexHtml = httpindexHtml();
            }
            //indexHtml = insertScriptAtBodyStart(indexHtml,`window.serverIP=[${conf.serverIP.map((c)=> `"${c}"`).join(",")}];`);
            res.end(indexHtml);
            //console.log("http ok");
            return;   
        }else {
            console.log(req.method,req.url);
            if (req.method ==="GET"){
                if (req.url==="/offer"){    
                    let isSend = false;            
                    initWebRtcClient(({signaling})=>{ 
                        if (signaling.offer && !isSend){
                            res.writeHead(200, { 'Content-Type': 'application/json' });  
                            res.end(JSON.stringify(signaling));
                            isSend=true;
                        }
                        
                    }).then(({signaling,dataChannel})=>{
                        dataChannel.onmessage = (e)=>{
                            const obj = JSON.parse(e.data as string);
                            if (obj.id){
                                console.log(obj);
                                let sig=routerSignaling.get(obj.id);
                                if (obj.set){
                                    if (!sig ){
                                        sig = {offerDataChannel:dataChannel,msg:[obj.msg]};
                                        routerSignaling.set(obj.id, sig );
                                    }else{
                                        if (sig.answerDataChannel){
                                            sig.answerDataChannel.send(JSON.stringify([obj.msg]));
                                            
                                        }else{
                                            sig.msg.push(obj.msg);
                                        }
                                        
                                    }
                                }else if (sig){
                                    if (!sig.answerDataChannel){
                                        sig.answerDataChannel = dataChannel;
                                    }
                                    if (!obj.msg){
                                        sig.answerDataChannel.send(JSON.stringify(sig.msg));
                                        sig.msg=[];
                                    }else {
                                        sig.offerDataChannel.send(JSON.stringify(obj.msg));
                                    }
                                }
                                
                                
                                
                                return;
                            }
                            //console.log("dc msg",e.data);
                            const db = conf.callBack(obj);
                            if (db){
                                if ( Array.isArray(db)){
                                    db.forEach(v=>{
                                        dataChannel.send(JSON.stringify(v));
                                    });
                                    
                                }else{
                                    dataChannel.send(JSON.stringify(db));
                                }                                
                            }
                        }; 
                        if (signaling.ICEList.length>0 && !isSend ){
                            res.writeHead(200, { 'Content-Type': 'application/json' });  
                            res.end(JSON.stringify(signaling));
                            isSend=true;
                        }
                    }); 
                    return;                   
                }else{
                    const u =path.join(...(req.url||"").split("/"));
                    const ext = path.extname(u);
                    if (ext){
                        res.setHeader("Access-Control-Allow-Origin","*");
                        readBinaryFile(path.join(conf.rootPath,u),contentType[ext]|| 'text/plain',res);
                        
                        return ;
                    }
                }
                res.writeHead(404);
                res.end();
            }else{
                function getBody  (hand:(obj:any)=>void) {
                    let body = "";
                    req.addListener("data",(db)=>{ 
                        body += db.toString(); 
                        //console.log(body);
                    });                    
                    req.addListener("end",()=>{ 
                        hand(JSON.parse(body));
                    });
                    req.addListener("error",(e)=>{
                        console.error(e);
                    });
                };
                switch (req.url){
                     case "/answer":
                        //console.log("post answer");
                        getBody(obj =>{
                            console.log(obj);
                            res.writeHead(200, { 'Content-Type': 'application/json' });  
                            res.end(JSON.stringify({}));
                            //webrtcChannelMap.get((obj as signalingStruct).id)
                            addRemoteAnswer(obj).then(val=>{
                                //console.log(val); 
                            });
                        });
                        return;
                    case "/find": 
                        res.writeHead(200, { 'Content-Type': 'application/json' });  
                        res.end(JSON.stringify(Object.fromEntries(nameMap)));
                        return;
                        
                    case "/api": 
                        getBody(obj =>{
                            res.writeHead(200, { 'Content-Type': 'application/json' });  
                            
                            let db={};
                            if (conf.callBack){
                                db = conf.callBack(obj);
                            }
                            console.log("api req",db);
                            res.end(JSON.stringify({db})); 
                        });
                       
                        return; 
                    default:
                        res.writeHead(404);
                        res.end();
                        return;
                }
            }
        }
         
    });
};
export const RunHttpServer = (
    conf: HttpConfigType  , 
    backServ:(ser:SerConfig)=>void,
    errNumber = 10 
      )=>{
    console.log(conf);
    if (defaultSerConfig.ser && defaultSerConfig.ser.Server){
        Object.assign(defaultSerConfig.ser.conf,conf);
        backServ(defaultSerConfig.ser);
        return;
    }
    const serv = createHttpServer(conf );
    let p = conf.port;
    //const runHttp = ()=>{  
    //    serv.listen(p);  
    //};
    serv.on('listening',()=>{
        console.log("listening port:",p);
        defaultSerConfig.ser = {
            Server:serv,httpPort:p,
            //PostMessageSet:new Set(), 
            conf,
            //HandleMsgMap:new Map(),
        };
        //defaultSerConfig.ser.HandleMsgMap.set(conf.pageTag,conf.getMessage);
        backServ(defaultSerConfig.ser);
    });
    serv.on('error',(err)=>{
        console.log(err,p.toString() );
        if (err.message.startsWith("listen EADDRINUSE:")){ 
            if (errNumber===(p-conf.port)){
                return;
            }
            p++;
            setTimeout(() => {
                serv.close();
                serv.listen(p);
            });
        }
    });     
    serv.listen(p);
};