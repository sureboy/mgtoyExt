import * as http from 'http'; 
import * as path from 'path';  
import * as fs from "fs"; 
export type HttpConfigType = { 
    port:number, 
    rootPath:string,
    webUI:string,
    //callBack:(obj:any)=>any ,
    handleGetReq:{[key:string]:(uri:URL,db:(k:any)=>void)=>void},
    handlePostReq:{[key:string]:any}
} 
export type SerConfig = { 
    httpPort:number, 
    Server?: http.Server
    conf:HttpConfigType , 
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
    const t = setTimeout(() => {
        console.error('Forced shutdown: closing all connections.');
        server.closeAllConnections();
        this.ser=undefined;
        //process.exit(1);
    }, 10000); 
    server.addListener('close',()=>{
        clearTimeout(t);
        this.ser=undefined;
    });
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
const readBinaryFile = (
    filePaths:string,
    contentType:string,
    res:http.ServerResponse<http.IncomingMessage> & {
        req: http.IncomingMessage;
    },
    notFound:()=>void
    ) =>{
    try{
        fs.stat(filePaths, (err, stats) => {
            if (err || !stats.isFile()) {
                notFound();
                //res.statusCode = 404;
                //res.end('File not found');
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
        notFound();
        //res.writeHead(404);
        //res.end();
    }
};
function createHttpServer   (conf: HttpConfigType   ) {   
    //let dataChannel: RTCDataChannel|undefined = undefined;
    return http.createServer((req, res) => { 
        if (!req.url || req.url==="/" ){
            res.setHeader("Access-Control-Allow-Origin","*");
            res.writeHead(200, { 'Content-Type': 'text/html' });
            let indexHtml = "";
            //console.log("index path",conf.rootPath);
            //path.dirname()
            try{
                indexHtml = fs.readFileSync(conf.rootPath,{encoding:'utf8'}) ;
            }catch(e){
                indexHtml = httpindexHtml();
            }
            //indexHtml = insertScriptAtBodyStart(indexHtml,`window.serverIP=[${conf.serverIP.map((c)=> `"${c}"`).join(",")}];`);
            res.end(indexHtml);
            //console.log("http ok");
            return;   
        }else {
            //req
            //console.log(req );
            
            if (req.method ==="GET"){

                try{
                    const uri = new URL(req.url, 'http://fake-base');
                    
                    conf.handleGetReq[uri.pathname](uri,(db:any)=>{
                        if (db.code && db.url){
                            res.writeHead(db.code, {
                                Location: db.url
                            });
                            res.end();
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' }); 
                        res.end(JSON.stringify(db)); 
                    });
                }catch(e){
                    //console.log(e); 
                    const u =path.join(...(req.url||"").split("/"));
                    const ext = path.extname(u);
                    if (ext){
                        res.setHeader("Access-Control-Allow-Origin","*");
                        const extVal = contentType[ext]|| 'text/plain';
                        readBinaryFile(
                            path.join(path.dirname(conf.rootPath),u),
                            extVal,res,
                        ()=>{
                            readBinaryFile(path.join(conf.webUI,u),extVal,res,()=>{
                                res.writeHead(404);
                                res.end();
                            });
                        }
                        );
                        
                        return ;
                    }
                }
                 
            }else  if (req.method ==="POST"){
                getBody(req,db=>{ 
                    try{
                        conf.handlePostReq[req.url!](db,(reqdb:any)=>{
                            res.writeHead(200, { 'Content-Type': 'application/json' }); 
                            res.end(JSON.stringify(reqdb)); 
                        });
                    }catch(e){
                        res.writeHead(404);
                        res.end();
                    }
                }); 
            }else{
                res.writeHead(404);
                res.end();
            }
        }
         
    });
};
function getBody  (req: http.IncomingMessage,hand:(obj:any)=>void) {
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
export const RunHttpServer = (
    conf: HttpConfigType  , 
    backServ:(ser:SerConfig)=>void,
    errNumber = 10 
      )=>{
    console.log(conf);
    if (defaultSerConfig.ser && defaultSerConfig.ser.Server){ 
        defaultSerConfig.ser.conf = conf;
        //Object.assign(defaultSerConfig.ser.conf,conf);
        setTimeout(()=>{ 
            backServ(defaultSerConfig.ser!);
        });
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