import  { WebSocketServer } from 'ws' ;
import * as http from 'http';  
export const initWebSocket = (conf:{ port?: number,server?:http.Server,callBack:(obj:any)=>any })=>{
    console.log("start websocket");
    const wss = new WebSocketServer(conf);
    try{  
        //ws.Server
        
        //console.log("1 start websocket");
        wss.on("error",e=>{
            console.error(e);
        });
        wss.on('connection', (ws) => {
            //console.log('✅ A new client connected.');

            // 向新连接的客户端发送欢迎消息
            ws.send(JSON.stringify({ type: 'system', message: 'Welcome!' }));

            // 监听来自客户端的消息
            ws.on('message', (data) => {
                 
                const messageObj =JSON.parse(data.toString()) as {name:string,msg:string};
                console.log(`Received: ${messageObj.name}`);
                ws.send(JSON.stringify(  conf.callBack(messageObj)),err=>{
                    if (err){console.error(err);}
                });
                 /*
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageString);
                    }
                });*/
                
            });

            // 处理连接关闭事件
            ws.on('close', () => {
                console.log('❌ A client disconnected.');
            });

            // 处理错误
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
        console.log('💬 Chat server running on ws://localhost:8080');
        
    }catch(e){
        console.error(e);
    }
    return wss;
};
