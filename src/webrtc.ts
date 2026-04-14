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
  console.log(dc);
  //dc
  dc.onopen = () => {
    console.log('✅ DataChannel 已打开，连接已建立！',dc.id);
    //dc.send(`Hello from Node.js (offer)!`);
  };
  dc.onmessage = (event) => console.log(`📩 收到消息: ${event.data}`);
  dc.onerror = (error) => {
    //closeWebRtcConn(dc);
    console.error('❌ DataChannel 错误:', error);
  };
  dc.onclose = () => {
    //closeWebRtcConn(dc);
    console.log('🔒 DataChannel 已关闭');
  };
}
function setupPeerConnection(pc: RTCPeerConnection,id:string){
  const signaling:signalingStruct = {ICEList:[],id:"" };
  const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' });

  // 可选：如果需要接收音频，同样创建一个仅接收的音频收发器
  const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
  console.log(videoTransceiver,audioTransceiver);
  
  pc.onicecandidate = (e) => {
    if (e.candidate) { 
      signaling.ICEList.push(e.candidate.toJSON()); 
    } else {
      console.log(signaling.ICEList); 
    }
  };
   

  const dataChannel = pc.createDataChannel('chat');
 

  setupDataChannel(dataChannel,id);
  //signaling.id =webrtcChannelMap.size;
  //webrtcChannelMap.set(signaling.id,pc);
  pc.ontrack = event => { 
    console.log(event,`收到远程 track: ${event.track.kind}`); 
    /*
    webrtcChannelMap.forEach((v,k)=>{
      if (k!==signaling.id){
        v.addTrack(event.track);
      }
    });*/
  };
  //console.log(dataChannel.id,webrtcChannelMap,Object.fromEntries(webrtcChannelMap));
  return {dataChannel,signaling};
}
 

export const initWebRtcClient =async ()=>{
  //const connPC =  
  const {id,pc} = pool.createConnection();;
  const {dataChannel,signaling}  = setupPeerConnection(pc,id);
 
  signaling.offer=(await pc.setLocalDescription(await pc.createOffer())).toSdp().sdp;// pc.localDescription.sdp;
  signaling.id = id;
  return {signaling,dataChannel,pc};    
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
 

  

 
 