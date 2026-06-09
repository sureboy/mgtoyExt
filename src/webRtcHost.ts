import  { RTCPeerConnection ,RTCDataChannel,
    RTCIceCandidate,RTCSessionDescription } from 'werift';
import {pool} from './webrtc'; 
import dgram from 'dgram';
import { connType } from './webRTCPool';
//import { time } from 'console';
//import { json } from 'stream/consumers';
//const pool = new ConnectionPool();
const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
 
    const sdp  = await StreamConnection.createOffer() ;
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp);
    return sdp;
 
}; 
const setRemoteRTCMsg = (MsgObj:any,conn:{pc: RTCPeerConnection,dc:{send(data: string): void}})=>{
    //console.log(MsgObj);
    if (MsgObj.candidate){
        conn.pc.addIceCandidate(new RTCIceCandidate(MsgObj)).then(()=>{
            //console.log( MsgObj );
        }).catch(e=>{
            //setTimeout(()=>{
            //    setRemoteRTCMsg(MsgObj,conn)
            //},2000)
            console.error(e);
        }) ;
        return;
    }
    if (MsgObj.sdp){ 
        conn.pc.setRemoteDescription(new RTCSessionDescription(MsgObj.sdp,MsgObj.type)).then(()=>{
            if (MsgObj.type==="offer"){
                conn.pc.createAnswer().then(sdp=>{
                    conn.pc.setLocalDescription(sdp);
                    conn.dc.send(JSON.stringify(sdp));                 
                });
            } 
        }).catch(e=>{
            console.error(e);
        });  
        return;
    }
    if (MsgObj.online){
        MsgObj.online = !('onmessage' in conn.dc);
        return;
    }
};
export const createWebRtcConnWithUDP = (
    ready:(c:connType)=>void,
    ok:(c:connType)=>void,
    create:boolean,host:string="127.0.0.1:9003",_id?:string,
     )=>{
  const conn = pool.createConnection(_id);
  const {id,pc} = conn;
  const client = dgram.createSocket('udp4');
  const [SERVER_HOST,SERVER_PORT] = host.split(":");  
  
  let timeoutMap:Map<number, NodeJS.Timeout>|undefined =new Map();
  const closeClient = (id?:string)=>{
    client.close();
    timeoutMap?.forEach(v=>{
        clearTimeout(v);
    });
    timeoutMap?.clear();
    timeoutMap=undefined;
    if (id){
        pool.closeConnection(id);
    }
  };
  //conn.dc = 
  const outObj = {id,pc,
    dc:{
        send(msg:string){
            
            const time = Date.now(); 
            console.log("udp send",create,time,msg);
            let sender = 10;
            const s =()=>{ 
                //console.log(msg);
                client.send(
                    JSON.stringify(
                    {id,create,msg:Buffer.from(msg).toString('base64'),time }
                ), 
                    Number(SERVER_PORT), SERVER_HOST, (err) => {
                    if (err) {
                        console.error('发送失败:', err);
                        closeClient(id);
                    } else {
                        console.log('消息已发送'); 
                    }
                });
                sender--;
                if (sender<=0){
                    closeClient(id);
                    return;
                }
                timeoutMap?.set(time, setTimeout(()=>{
                    s();
                },5000));
            } ;
            s();       
        }
    }
  };
  client.on("message",(msg,rinfo)=>{ 
  
    const db = JSON.parse(msg.toString());
    
    if (db.time && timeoutMap?.has(db.time)){
        clearTimeout(timeoutMap?.get(db.time));
        timeoutMap?.delete(db.time);
        //console.log("del",db);
        return;
    }
    if (db.msg){
        console.log("udp back",db,Buffer.from(db.msg, 'base64').toString('utf8'));
        setRemoteRTCMsg(JSON.parse(Buffer.from(db.msg, 'base64').toString('utf8')),outObj);
    } 
    //Buffer.from(msg.toString(), 'base64').toString('utf8');
    
  });
  client.on("error",(e)=>{
    console.error("webrtc err",e);
    closeClient(id);
  });
  pc.onicecandidate = (e)=>{
    if (e.candidate) { 
        outObj.dc.send(JSON.stringify(e.candidate.toJSON()));
    }else{
        ready(conn);
    }
  };
  pc.onnegotiationneeded=()=>{
    createOffer(pc).then(sdp=>{
        console.log("offer",sdp);
      outObj.dc.send(JSON.stringify(sdp));
    });
  };
  conn.dc = pc.createDataChannel(id,{ordered:false,protocol:"json"});
  conn.dc.onopen=()=>{
    outObj.dc = conn.dc!;
    closeClient();
    ok(conn);
  };
  //return conn;
};