import  { RTCPeerConnection ,RTCDataChannel,
    RTCIceCandidate,RTCSessionDescription } from 'werift';
import {pool} from './webrtc'; 
import dgram from 'dgram';
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
export const createWebRtcConn = (host:string="127.0.0.1:9003")=>{
  const {id,pc} = pool.createConnection();
  const client = dgram.createSocket('udp4');
  const [SERVER_HOST,SERVER_PORT] = host.split(":");
  const outObj = {pc,
    dc:{
      send(msg:string){
        client.send(JSON.stringify({id,create:true,msg}), Number(SERVER_PORT), SERVER_HOST, (err) => {
            if (err) {
            console.error('发送失败:', err);
            client.close();
            } else {
            console.log('消息已发送');
 
            }
        }); 
      }
    }
  };
  client.on("message",(msg,rinfo)=>{
    setRemoteRTCMsg(JSON.parse(msg.toString()),outObj);
  });
  client.on("error",(e)=>{
    console.error("webrtc err",e);
    client.close();
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
    client.close();
  };
};