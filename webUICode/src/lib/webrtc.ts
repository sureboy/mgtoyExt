import type {signalingStruct} from '$lib/utils/util';
export const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {urls: 'stun:stun.qq.com:3478'}, 
    ]
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
    peerConnection.onconnectionstatechange = ()=>{
        if (peerConnection.connectionState === 'closed' 
           || peerConnection.connectionState === 'failed' 
            //|| peerConnection.connectionState==="disconnected"
        ) {
            peerConnection.close();
        }
    };
    await peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:sign.offer,type:"offer"}));
 
    sign.ICEList.forEach(ice=>{
        peerConnection.addIceCandidate(ice);
    }); 
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('本地 Answer 已创建');

    // 通过信令服务器发送 Answer
    const msgAnswer:signalingStruct = {   answer: answer.sdp,ICEList:[] ,id:sign.id};
  
    let isSend = false;
    const t = setTimeout(()=>{
        //if (!isSend){
        Answer(msgAnswer);
        isSend = true;
    },5000);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            msgAnswer.ICEList.push (event.candidate);
            console.log('ICE Candidate 已发送',event.candidate);
        }else{ 
            if (!isSend){
                Answer(msgAnswer); 
                clearTimeout(t);
            }
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
    return new Promise<{dataChannel:RTCDataChannel,peerConnection:RTCPeerConnection,signaling: signalingStruct}>((resolve,reject)=>{
        getOffer().then(signaling=>{
            const peerConnection = new RTCPeerConnection(configuration);
            handleOffer(
                signaling,
                peerConnection,(answer)=>{
                    pushAnswer(answer).catch(reject);
            },dataChannel=>{
                resolve({dataChannel,peerConnection,signaling});                 
            }).catch(reject);
        }).catch(reject);
    }); 
};
export const createRTCTrackOffer =async (
    localStream: MediaStream,
    receiveChannel: RTCDataChannel,
    id:string,closeHand:()=>void)=>{
    
    const StreamConnection = new RTCPeerConnection(configuration); 

    receiveChannel.send(JSON.stringify({id,set:true}));
    localStream.getTracks().forEach(track => { 
        console.log(track);
        //if (track.kind==="video"){
        StreamConnection.addTrack(track, localStream);
        //}        
    });  
    const dataChannel = StreamConnection.createDataChannel('chat',{ordered:false});
    let heartbeat = 0;
    dataChannel.onopen = e=>{
        heartbeat = performance.now();
        dataChannel.send(JSON.stringify({heartbeat}));
        const timeout = setInterval(()=>{
            if (performance.now()-heartbeat >10000){
                clearInterval(timeout);
                StreamConnection.close();
                console.log("time Out");
                closeHand();
            }else{
                try{
                    dataChannel.send(JSON.stringify({heartbeat}));
                }catch(e){
                    clearInterval(timeout);
                    StreamConnection.close();
                    closeHand();
                    console.log(e);
                }
                
            }
        },3000);

        StreamConnection.onicecandidate = event=>{
            if (event.candidate) { 
                dataChannel.send(JSON.stringify( event.candidate.toJSON() ));
            }
        };
    };
    dataChannel.onmessage = e=>{
        console.log(e.data);
        const obj = JSON.parse(e.data);
        if (obj.heartbeat){
            heartbeat = performance.now();
            return;
        }
        if (obj.candidate){
            StreamConnection.addIceCandidate(new RTCIceCandidate(obj.candidate)).then(()=>{
                console.log(JSON.stringify(obj.candidate));
            });
            return;
        }
        if (obj.sdp){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(obj));
            if (obj.type==="offer"){
                (async ()=>{
                    const answer = await StreamConnection.createAnswer();
                    await StreamConnection.setLocalDescription(answer);
                    dataChannel.send(JSON.stringify(answer));
                })();
            }
        }
    };
    StreamConnection.onicecandidate = event => {
        //console.log(event)
        if (event.candidate) { 
            //event.candidate.toJSON()
            receiveChannel.send(JSON.stringify({id,set:true,msg:{ id,   candidate: event.candidate.toJSON()  }}));
        //}else{
            //console.log("ICE end");
        }
    };  
    StreamConnection.oniceconnectionstatechange=(e)=>{
        if (StreamConnection.connectionState === 'closed' 
          ||  StreamConnection.connectionState === 'failed' 
        //  ||  StreamConnection.connectionState==="disconnected"
        ) {
            StreamConnection.close();
            
            closeHand();/*
            link.textContent="重新连接"
            link.href="#"
            link.target=""
            link.onclick=()=>{
                startVideoPeerConn(localStream,receiveChannel,id)
            }*/
    
        }
        //if (StreamConnection.connectionState === 'closed')
        console.log(StreamConnection.connectionState);
    };
    
    const offer = await StreamConnection.createOffer();
    await StreamConnection.setLocalDescription(offer);
    receiveChannel.send(JSON.stringify({id,set:true,msg:{ id, offer }}));
    receiveChannel.onmessage = (event) => {
        
        const db = JSON.parse(event.data) as { candidate?:RTCIceCandidateInit,answer?:RTCSessionDescriptionInit};
        if (db.candidate){
            console.log(`get ICE: ${db.candidate}`) ;
            //await StreamConnection.setRemoteDescription(new RTCSessionDescription({sdp:sign.offer,type:"offer"}));
            StreamConnection.addIceCandidate(new RTCIceCandidate(db.candidate)).then(()=>{
                console.log(JSON.stringify(db.candidate));
            });
        }else if (db.answer){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(db.answer));

        }
    };  
    return {dataChannel,StreamConnection};
};

export const createRTCTrackAnswer = ( 
    dataChannel: RTCDataChannel,
    db:{id:string,offer:any,candidate:any}[],
    ontrack:(event: RTCTrackEvent)=>void,datachannel:(channel: RTCDataChannel)=>void)=>{
    const StreamConnection = new RTCPeerConnection(configuration);  
    let id = ""  ;  
    db.forEach(v=>{
        if (v.id && !id){
            id = v.id;
        }
        if (v.offer){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(v.offer));
        }else if (v.candidate){
            StreamConnection.addIceCandidate(new RTCIceCandidate(v.candidate)).then(()=>{
                console.log(JSON.stringify(v.candidate));
            });
        }
    });

    StreamConnection.oniceconnectionstatechange=(e)=>{
        if (StreamConnection.connectionState === 'closed' 
            || StreamConnection.connectionState === 'failed' 
            //|| StreamConnection.connectionState==="disconnected"
        ) {
            StreamConnection.close();
            //exitFullscreen()
            //closeHand();
        }
        console.log(StreamConnection.connectionState);
    };
    let heartbeat = 0;
    StreamConnection.ondatachannel = (event) => {
        event.channel.onmessage = e=>{
            console.log(e.data);
            const obj = JSON.parse(e.data);
            if (obj.heartbeat){
                heartbeat = obj.heartbeat;
                event.channel.send(e.data);
                return;
            }
            if (obj.candidate){
                StreamConnection.addIceCandidate(new RTCIceCandidate(obj)).then(()=>{
                    console.log(JSON.stringify(obj));
                });
                return;
            }
            if (obj.sdp){
                StreamConnection.setRemoteDescription(new RTCSessionDescription(obj));
                if (obj.type==="offer"){
                    (async ()=>{
                        const answer = await StreamConnection.createAnswer();
                        await StreamConnection.setLocalDescription(answer);
                        event.channel.send(JSON.stringify(answer));
                    })();
                }
            }
        };
        StreamConnection.onnegotiationneeded = async()=>{
            const offer =await StreamConnection.createOffer();
            await StreamConnection.setLocalDescription(offer); 
            event.channel.send(JSON.stringify(offer));
        };
        StreamConnection.onicecandidate  =e => {
            if (e.candidate) {  
                event.channel.send(JSON.stringify( e.candidate.toJSON() ));
            }
        };
        datachannel(event.channel);
    };
    
    
    StreamConnection.onicecandidate = event => {
        if (event.candidate) { 
            //event.candidate.toJSON()
            dataChannel.send(JSON.stringify({id, msg:{    candidate: event.candidate.toJSON() }}));
        }else{
            console.log("ICE end");
        }
    };
    StreamConnection.ontrack =ontrack;
    /* event=>{
        console.log(event)
        if (event.streams.length>0){
            document.getElementById("video").style.display=""
            getVideo().srcObject = event.streams[0];
            if (!dialogConfig.dialogEl?.open){
                dialogConfig.dialogEl?.showModal() 
            }
        } 
    }*/
    (async ()=>{
        try{
            const answer = await StreamConnection.createAnswer({ iceRestart: true });
            await StreamConnection.setLocalDescription(answer);
            dataChannel.send(JSON.stringify({id,msg:{answer}}));
        }catch(e){
            console.log(e);
        }
    })();
    return StreamConnection;
};