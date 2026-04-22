import  { RTCPeerConnection ,RTCDataChannel } from 'werift';
import {ConnectionPool} from './webRTCPool'; 
//import readline from 'readline';
//import {stringToBase64Url} from './strToJson';
const pool = new ConnectionPool();

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
export const initWebRtcClient =async (back:(msg:{dataChannel: RTCDataChannel,signaling: signalingStruct,pc: RTCPeerConnection})=>void)=>{ 
  const {id,pc} = pool.createConnection();
  const dataChannel = pc.createDataChannel('chat',{ordered:false,protocol:"json"});

  const signaling:signalingStruct = {ICEList:[],id };
  pc.onicecandidate = (e) => {
    //console.log(e);
    if (e.candidate) { 
      signaling.ICEList.push(e.candidate.toJSON()); 
    } else {
      back({dataChannel,signaling,pc});
      //console.log(signaling.ICEList); 
    }
  }; 
  setupDataChannel(dataChannel,id);     
  signaling.offer =(await pc.setLocalDescription(await pc.createOffer())).toSdp().sdp;
  return {dataChannel,signaling,pc};
};
export const addRemoteAnswer =async (signaling:signalingStruct  ) =>{ 
  const pc = pool.getConnection(signaling.id);
  if (!pc){
    return {msg:"add anserr err"};
  }
  try{
    await pc.setRemoteDescription({ type: 'answer', sdp: signaling["answer"]  });
    for (const candidate of    signaling["ICEList"] ) {
      await pc.addIceCandidate( candidate );
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
    if (!v.answerDataChannel){
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
export const webRtcRouterHandle = (obj:any,dataChannel: RTCDataChannel) =>{
  if (obj.video){
    webRtcVideoList(dataChannel);
    return true;
  }
  if (obj.id){
      //console.log(obj);
      let sig=pool.routerSignaling.get(obj.id);
      if (obj.set){
          if (!sig || !obj.msg ){
              sig = {offerDataChannel:dataChannel,msg:(obj.msg?[obj.msg]:[])};
              pool.routerSignaling.set(obj.id, sig );
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
      
      
      return true;
  }
  return false;
};

  

 
 