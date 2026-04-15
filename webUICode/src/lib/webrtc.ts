import type {signalingStruct} from '$lib/utils/util';
export const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};
 
const pushAnswer = (answer:signalingStruct)=>{
    return new Promise<void>((resolve,reject)=>{
        fetch("/answer",{
            method:"POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body:JSON.stringify(answer)
        }).then(res=>{
            if (res.ok){
                resolve();
            }else{
                reject();
            }
        }).catch(reject);
    });
};
const getOffer =()=> {
    return new Promise<signalingStruct>((resolve,reject)=>{
        fetch("/offer").then(res=>{
            if (res.ok) { 
                res.json().then(resolve);
            }else{
                reject();
            }
        }).catch(reject);
    });
};
export async function handleOffer(
    sign:signalingStruct,
    peerConnection: RTCPeerConnection,
    Answer:(Answer:signalingStruct)=>void,
    backDatachannel:(dataChannel: RTCDataChannel)=>void,
    //track?:(track:RTCTrackEvent)=>void
) { 
    await peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:sign.offer,type:"offer"}));
 
    sign.ICEList.forEach(ice=>{
        peerConnection.addIceCandidate(ice);
    }); 
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('本地 Answer 已创建');

    // 通过信令服务器发送 Answer
    const msgAnswer:signalingStruct = {   answer: answer.sdp,ICEList:[] ,id:sign.id};
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            msgAnswer.ICEList.push (event.candidate);
            console.log('ICE Candidate 已发送');
        }else{ 
            Answer(msgAnswer); 
            return;
        }
    };
    //peerConnection.ontrack =track;

    // 监听 Data Channel，接收消息
    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel; 
        console.log("webrtc conn ok");
        backDatachannel(dataChannel);
        //receiveChannel.onmessage = msg;
    };
    //return peerConnection;
}
 
export const connWebRTC =()=>{
    return new Promise<{dataChannel:RTCDataChannel,peerConnection:RTCPeerConnection}>((resolve,reject)=>{
        getOffer().then(signaling=>{
            const peerConnection = new RTCPeerConnection(configuration);
            handleOffer(
                signaling,
                peerConnection,(answer)=>{
                    pushAnswer(answer).catch(reject);
            },dataChannel=>{
                resolve({dataChannel,peerConnection});                 
            }).catch(reject);
        }).catch(reject);
    }); 
};
