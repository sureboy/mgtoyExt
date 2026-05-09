import  { RTCPeerConnection ,RTCDataChannel } from 'werift';
import {ConnectionPool} from './webRTCPool'; 
import dgram from 'dgram';
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
const postWebRTCMsg = (obj={id:"",create:false,host:"127.0.0.1:9003"})=>{
  const client = dgram.createSocket('udp4');
  const [SERVER_PORT, SERVER_HOST] = obj.host.split(":");
  client.send(JSON.stringify(obj), Number(SERVER_PORT), SERVER_HOST, (err) => {
    if (err) {
      console.error('发送失败:', err);
      client.close();
    } else {
      console.log('消息已发送');
      // 可选：如果需要接收服务器的响应，监听 'message' 事件
      // 否则可以直接关闭 socket
      // client.close();
    }
  });
  client.on('message', (msg, rinfo) => {
    console.log(`收到来自 ${rinfo.address}:${rinfo.port} 的响应: ${msg.toString()}`);
    // 收到响应后关闭 socket
    client.close();
  });

  // 6. 错误处理
  client.on('error', (err) => {
    console.error(`socket 错误: ${err.stack}`);
    client.close();
  });
};
export const createWebRtcConn = (host:string="127.0.0.1:9003")=>{
  const {id,pc} = pool.createConnection();
  const outObj = {pc,
    dc:{
      send(db:string){
        postWebRTCMsg({id,create:true,host});
      }
    }
  };
  pc.onnegotiationneeded=()=>{
    createOffer(pc).then(sdp=>{
      outObj.dc.send(JSON.stringify(sdp));
    });
  };
  const dataChannel = pc.createDataChannel(id,{ordered:false,protocol:"json"});

};
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
const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
 
    const sdp  = await StreamConnection.createOffer() ;
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp);
    return sdp;
 
};
export const initWebRtcClient =async (back:(msg:{dataChannel: RTCDataChannel,signaling: signalingStruct,pc: RTCPeerConnection})=>void)=>{ 
  const {id,pc} = pool.createConnection();
  const dataChannel = pc.createDataChannel(id,{ordered:false,protocol:"json"});

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
export const webRtcRouterHandle = (obj:any,dataChannel: RTCDataChannel) =>{
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

  

 
 