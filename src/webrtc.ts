import  {
  RTCPeerConnection ,
  RTCDataChannel ,
  RTCIceCandidate,
  RTCSessionDescription
  } from 'werift';
import {ConnectionPool} from './webRTCPool'; 
//import dgram from 'dgram';
//import readline from 'readline';
//import {stringToBase64Url} from './strToJson';
export const pool = new ConnectionPool();

export type  signalingStruct = {
  ICEList:{
    candidate: string;
    sdpMid: string | undefined;
    sdpMLineIndex: number | undefined;
    usernameFragment: string | undefined;
}[],
  offer?:string,
  answer?:string,
  id:string;
}

function setupDataChannel(dc:RTCDataChannel,id:string) {   
  dc.onopen = () => console.log('✅ DataChannel 已打开，连接已建立！',dc.id) ;
  dc.onmessage = (event) => console.log(`📩 收到消息: ${event.data}`);
  dc.onerror = (error) => {
    //closeWebRtcConn(dc);
    pool.closeConnection(id);
    console.error('❌ DataChannel 错误:', error);
  };
  dc.onclose = () => {
    //closeWebRtcConn(dc);
    pool.closeConnection(id);
    console.log('🔒 DataChannel 已关闭');
  };
}

export const initWebRtcClient =async (
  back:(msg:{dc: RTCDataChannel,signaling: signalingStruct,pc: RTCPeerConnection})=>void)=>{ 
  const conn = pool.createConnection();
  const {pc,id} = conn;
  const dc = pc.createDataChannel(id,{ordered:false,protocol:"json"});
  conn.dc = dc;
  const signaling:signalingStruct = {ICEList:[],id };
  pc.onicecandidate = (e) => { 
    if (e.candidate) { 
      signaling.ICEList.push(e.candidate.toJSON()); 
    } else {
      back({dc,signaling,pc}); 
    }
  }; 
  setupDataChannel(dc,id);     
  signaling.offer =(await pc.setLocalDescription(await pc.createOffer())).toSdp().sdp;
  return {conn,signaling};
};
export const addRemoteAnswer =async (signaling:signalingStruct  ) =>{ 
  const conn = pool.getConnection(signaling.id);
  if (!conn?.pc){
    return {msg:"add anserr err"};
  }
  try{
    await conn.pc.setRemoteDescription({ type: 'answer', sdp: signaling["answer"]  });
    for (const candidate of    signaling["ICEList"] ) {
      await conn.pc.addIceCandidate( candidate );
    }
    return {msg:"add anserr ok"}; 
  }catch(e){
    console.error(e);
    return {msg:"add anserr err"};
  }
  
};

const webRtcVideoList = (dataChannel: RTCDataChannel)=>{
  const videoList:string[] =[];
  pool.routerSignaling.forEach((v,k)=>{
    if (!v.remoteDataChannel){
      videoList.push(k);
    }      
  });
  console.log("vlist",videoList,pool.routerSignaling.size);
  //videoList.push("testVideo");
  //dataChannel.
  dataChannel.send(JSON.stringify({
    videoList 
  }));
     // return true;
};
export const setRemoteRTCMsg = (MsgObj:any,conn:{pc: RTCPeerConnection,dc:{send(data: string): void}},maxNum=10)=>{
    //console.log(MsgObj);
    if (MsgObj.candidate){
        
        conn.pc.addIceCandidate(new RTCIceCandidate(MsgObj)).then(()=>{
            console.log( MsgObj );
        }).catch(e=>{
            maxNum--;
            if (maxNum>0){
                setTimeout(()=>{
                setRemoteRTCMsg(MsgObj,conn,maxNum);
            },2000);
            }
            
            console.error(e);
        }) ;
        return;
    }
    if (MsgObj.sdp){ 
        conn.pc.setRemoteDescription(new RTCSessionDescription(MsgObj.sdp,MsgObj.type)).then(()=>{
          console.log(MsgObj);
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
 
};
export const openDataChannelEvent = (dataChannel:RTCDataChannel)=>{
  dataChannel.addEventListener('open', ()=>{
    pool.getAllConnectionIds().forEach(v=>{
      if (v===dataChannel.label){
        return;
      }
      dataChannel.send(JSON.stringify({name:v,type:'webrtc'}));
      pool.getConnection(v)?.dc?.send(JSON.stringify({name:dataChannel.label,type:'webrtc'}));
    });
  });
  
};
export const webRtcRouterHandle = (obj:any,dataChannel: RTCDataChannel) =>{
  if (obj.type){
    switch (obj.type) {
      case "passthrough":
        const conn = pool.getConnection(obj.id);
        if (conn){
          obj.id = dataChannel.label;
          conn.dc?.send(JSON.stringify(obj));
        }
        return;

    }
    //return
  }
  if (obj.video){
    webRtcVideoList(dataChannel);
    return true;
  }

  if (obj.id){
      //console.log(obj);
      let sig=pool.routerSignaling.get(obj.id);
      //if (!sig || !obj.msg){}
 
      const set = dataChannel.label === obj.id;
      if (set){
          if (!sig || !obj.msg ){
              sig = {localDataChannel:dataChannel,msg:[obj]};
              pool.routerSignaling.set(obj.id, sig );
          }else{
              if (sig.remoteDataChannel){
                  sig.remoteDataChannel.send(JSON.stringify(obj));
              }else{
                  sig.msg.push(obj);
              }              
          }
      }else if (sig){
          if (!sig.remoteDataChannel){
              sig.remoteDataChannel = dataChannel;
          }
          while (sig.msg.length>0){
              dataChannel.send(JSON.stringify(sig.msg.shift()));
          }
          //if (obj.msg) {
          sig.localDataChannel.send(JSON.stringify(obj));
          //}
      }                        
      
      
      return true;
  }
  return false;
};

  

 
 