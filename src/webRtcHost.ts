import  { RTCPeerConnection ,RTCDataChannel,
    RTCIceCandidate,RTCSessionDescription } from 'werift';
import {pool} from './webrtc'; 
import dgram from 'dgram';
import { time } from 'console';
//import { json } from 'stream/consumers';
//const pool = new ConnectionPool();
const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
 
    const sdp  = await StreamConnection.createOffer() ;
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp);
    return sdp;
 
}; 
const setRemoteRTCMsg = (MsgObj:any,conn:{pc: RTCPeerConnection,dc:{send(data: string): void}})=>{
    console.log(MsgObj);
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
export const createWebRtcConn = (create=true,host:string="127.0.0.1:9003",maxSender=10 )=>{
  const {id,pc} = pool.createConnection();
  const client = dgram.createSocket('udp4');
  const [SERVER_HOST,SERVER_PORT] = host.split(":"); 
 
  //let time:number;
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
  const outObj = {pc,
    dc:{
        send(msg:string){
            const time = Date.now(); 
            let sender = maxSender;
            const s =()=>{ 
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
    //console.log(db);
    if (db.time){
        clearTimeout(timeoutMap?.get(db.time));
        timeoutMap?.delete(db.time);
    }
    if (db.msg){
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
    }
  };
  pc.onnegotiationneeded=()=>{
    createOffer(pc).then(sdp=>{
      outObj.dc.send(JSON.stringify(sdp));
    });
  };
  const dataChannel = pc.createDataChannel(id,{ordered:false,protocol:"json"});
  dataChannel.onopen=()=>{
    outObj.dc = dataChannel;
    closeClient();
  };
};