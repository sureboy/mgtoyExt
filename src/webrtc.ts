import  { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate,RTCDataChannel } from 'werift';
//import readline from 'readline';
//import {stringToBase64Url} from './strToJson';
export type  signalingStruct = {
  ICEList:{
    candidate: string;
    sdpMid: string | undefined;
    sdpMLineIndex: number | undefined;
    usernameFragment: string | undefined;
}[],
  offer?:string,
  answer?:string,
  id:number;
}
const webrtcChannelMap = new Map<number,RTCPeerConnection>();
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}; 

function setupDataChannel(dc:RTCDataChannel) {
  let role = "offer";
  dc.onopen = () => {
    console.log('✅ DataChannel 已打开，连接已建立！');
    dc.send(`Hello from Node.js (${role})!`);
  };
  dc.onmessage = (event) => console.log(`📩 收到消息: ${event.data}`);
  dc.onerror = (error) => console.error('❌ DataChannel 错误:', error);
  dc.onclose = () => console.log('🔒 DataChannel 已关闭');
}
function setupPeerConnection(pc: RTCPeerConnection){
   const signaling:signalingStruct = {ICEList:[],id:0 };
  pc.onicecandidate = (e) => {
    if (e.candidate) {
        //const candidateStr = e.candidate.candidate;
      signaling.ICEList.push(e.candidate.toJSON());
        //console.log(`[ICE] 收集到候选: ${candidateStr}`);
        //printSendPrompt('新 ICE 候选', candidateStr);
    } else {
      console.log(signaling.ICEList);
      //printSendPrompt("end",stringToBase64Url(JSON.stringify(msgList)));
    }
  };
  pc.onconnectionstatechange = () => {
    console.log(`🔌 连接状态: ${pc.connectionState}`);
    if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC 连接已成功建立！'); 
    }
  };

  pc.oniceconnectionstatechange = () => console.log(`❄️ ICE 状态: ${pc.iceConnectionState}`);

  const dataChannel = pc.createDataChannel('chat');
  setupDataChannel(dataChannel);
  signaling.id = dataChannel.id;
  webrtcChannelMap.set(dataChannel.id,pc);
  return {dataChannel,signaling};
}
/*
pc.ondatachannel = ({ channel }) => {
    console.log('📞 收到 DataChannel');
    dataChannel = channel;
    setupDataChannel(channel);
};*/

  
 

export const initWebRtcClient =async ()=>{
   const pc = new RTCPeerConnection(configuration); 
   const {dataChannel,signaling}  = setupPeerConnection(pc);
 
    const offer = await pc.createOffer();
    const k = await pc.setLocalDescription(offer);
    //k.toSdp().sdp
    //if (pc.localDescription){
      signaling.offer=k.toSdp().sdp;// pc.localDescription.sdp;
    //}
    return {signaling,dataChannel,pc};
     

};
export const addRemoteAnswer =async (signaling:signalingStruct  ) =>{ 
  const pc = webrtcChannelMap.get(signaling.id);
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
 

  

 
 