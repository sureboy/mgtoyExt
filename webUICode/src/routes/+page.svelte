<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
 
import {createRTCTrackAnswer ,connWebRTC,createRTCTrackOffer,createRtcTrack } from '$lib/webrtc' 
import ConnWebrtc,{ startWebRTC,dialogConfig} from '$lib/ConnWebrtc.svelte';
//import {getVideo} from '$lib/Fullscreen.svelte'
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import VideoScreen,{getVideo,toggleFullscreen} from '$lib/Fullscreen.svelte'
 
async function getLocalStream() { 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio:{
        echoCancellation: true,   // 开启回声消除
        noiseSuppression: true,   // 建议同时开启降噪
        autoGainControl: true     // 建议同时开启自动增益
    }, 
        });
        console.log('使用摄像头');
        return stream;
    } catch (error) { 
        //console.log(error)
        //return;
        //return undefined;
        console.log('摄像头不可用，播放默认视频文件', error);
        try{
            
            const localVideo = document.createElement("video") 
            localVideo.src = '/test.mp4'; // 替换为你的文件路径
            localVideo.loop = true;     // 循环播放
            localVideo.muted = true;     // 必须静音，否则可能无法自动播放
            localVideo.autoplay = true;  
            await new Promise((resolve) => {
                localVideo.onloadeddata = (e) => {
                    resolve(e)
                };
            });
            await localVideo.play(); 
            return localVideo.captureStream()
        }catch(e){
            console.log(e)
            //return undefined
        } 
    }
}
 
//let link:HTMLAnchorElement=undefined

//let dataChannel: RTCDataChannel 
//let Camera:HTMLButtonElement
const createRTCConn = ( dataChannel: RTCDataChannel)=>{
    const finalStream = new MediaStream();
    const pVideo = document.getElementById("video")
    pVideo.style.display=""
    const videoPlay =  getVideo()
    dialogConfig.dialogEl?.showModal() 
  
    const Camera = (document.getElementById("camera").firstChild as HTMLButtonElement)
    //Camera.textContent="⛶"
    Camera.onclick=()=>{
        getLocalStream().then(localStream=>{ 
            const video_self = createVideo()
            video_self.srcObject = localStream
            pVideo.append(video_self)
            localStream.getTracks().forEach(track => { 
                //console.log(track);
                //if (track.kind==="video"){
                pc.addTrack(track, localStream);
                //}        
            }); 
        })
        //videoPlay.muted = false
        //videoPlay.play()
        //toggleFullscreen();
    }   
    //finalStream
    
    videoPlay.srcObject = finalStream;
    //videoPlay.muted = true
    //videoPlay.play()
    const pc = createRTCTrackAnswer(dataChannel, (event)=>{ 
        finalStream.addTrack(event.track) 
    },(dc)=>{
        
    })
    dialogConfig.closeHandle=()=>{
        pc.close()
    }
   
}
 
const getTrackShowVideo = (pVideo: HTMLElement,StreamConnection:RTCPeerConnection)=>{
    let videoR:HTMLVideoElement
    const finalStream = new MediaStream();
    StreamConnection.ontrack = (e)=>{
        console.log("back",e)
        finalStream.addTrack(e.track)
        if (!videoR){
            videoR = createVideo()
            videoR.srcObject = finalStream
            pVideo.append(videoR)
        }
    }
}
const createMyWebRtc = (dataChannel: RTCDataChannel,closeHand?:()=>void)=>{
    const StreamConnection = createRtcTrack((candidate: RTCIceCandidateInit)=>{
        dataChannel.send(JSON.stringify({id:dataChannel.label,msg:{candidate}}))
    },closeHand)
    dataChannel.send(JSON.stringify({id:dataChannel.label}))
    let heartbeat = 0;
    const dc = StreamConnection.createDataChannel(dataChannel.label,{ordered:false})
    dc.onopen=()=>{
        heartbeat = performance.now();
        dc.send(JSON.stringify({heartbeat}));
        const timeout = setInterval(()=>{
            if (performance.now()-heartbeat >10000){
                clearInterval(timeout);
                //StreamConnection.close();
                console.log("time Out");
                StreamConnection.close();
                closeHand();
            }else{
                try{
                    dc.send(JSON.stringify({heartbeat}));
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
                dc.send(JSON.stringify( event.candidate.toJSON() ));
            }
        };
    }
    dc.onmessage = e=>{
        //console.log(e.data);
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
                StreamConnection.createAnswer().then(sdp=>{
                    StreamConnection.setLocalDescription(sdp);
                    dc.send(JSON.stringify(sdp));
                })
            }
        }
    };
    StreamConnection.ondatachannel = (e)=>{
        e.channel.onmessage = dc.onmessage
        //dc = e.channel
    }
    StreamConnection.onnegotiationneeded = (e)=>{
        
        console.log(e,StreamConnection.signalingState,StreamConnection.connectionState)
        if (StreamConnection.connectionState==="new")return
        StreamConnection.createOffer().then(sdp=>{
            StreamConnection.setLocalDescription(sdp); 
            dataChannel.send(JSON.stringify(sdp));
        });        
    }

    StreamConnection.onicecandidate = (e)=>{
        console.log(e.candidate,dataChannel.label)
        if (e.candidate){
            dataChannel.send(
                JSON.stringify({id:dataChannel.label, msg:{    candidate: e.candidate.toJSON() }}));
        }
    }

    return StreamConnection
}


const createOffer = ( StreamConnection: RTCPeerConnection ,dataChannel: RTCDataChannel)  =>{
    //const StreamConnection = createMyWebRtc(dataChannel,closeHand)

    StreamConnection.createOffer().then(sdp=>{
        //console.log(sdp)
        StreamConnection.setLocalDescription(sdp).then(()=>{
            dataChannel.send(JSON.stringify({id:dataChannel.label,msg:{sdp}}))
        
        })
        
    })
}
/*
const handInputText =(id:string)=>{
    if (id.length!=5 || !dataChannel){
        return false
    }
    
    dataChannel.send(JSON.stringify({id}))
    return true
}*/
const createVideo = ()=>{
    const video_self = document.createElement("video")
    video_self.muted = true;
    video_self.controls=true;
    video_self.autoplay = true;
    video_self.height = 300;
    video_self.width = 200;
    return video_self
    //video_self.srcObject = localStream
}
 
const initDC = (receiveChannel: RTCDataChannel,StreamConnection:RTCPeerConnection )=>{
    //let StreamConnection:RTCPeerConnection = undefined
    receiveChannel.addEventListener("message",(e)=>{
        const db = JSON.parse(e.data)
        console.log("initDC",db)
        if (db.id && db.msg){
            if (!dialogConfig.dialogEl.open){
                dialogConfig.dialogEl.showModal()
                //StreamConnection = createMyWebRtc(receiveChannel)
                
            }
            if (db.msg.sdp){
                
                StreamConnection.setRemoteDescription(new RTCSessionDescription(db.msg.sdp))
                if (db.msg.sdp.type==="offer"){
                        const finalStream = new MediaStream();
                        const pVideo = document.getElementById("video")
                        pVideo.style.display=""
                        getVideo().srcObject=finalStream
                        StreamConnection.ontrack = (e)=>{
                            console.log(e)
                            finalStream.addTrack(e.track)
                        }
                    StreamConnection.onicecandidate = (e)=>{
                        console.log(e.candidate,db.id)
                        if (e.candidate){
                            receiveChannel.send(
                                JSON.stringify({id:db.id, msg:{    
                                    candidate: e.candidate.toJSON() }}));
                        }
                    }
                    StreamConnection.createAnswer({ iceRestart: true }).then(sdp=>{
                            
                        StreamConnection.setLocalDescription(sdp)
                        receiveChannel.send(JSON.stringify({id:db.id,msg:{sdp}}))
                        console.log("answer",sdp)
                    })
                }
            }
            if (db.msg.candidate){
                StreamConnection.addIceCandidate(new RTCIceCandidate(db.msg.candidate))
            }
            

        }
    })
}
const init = (receiveChannel: RTCDataChannel )=>{
    
    initDataChannel(receiveChannel) 
    //dataChannel = receiveChannel
    const StreamConnection = createMyWebRtc( receiveChannel,reloadHandle)
    initDC(receiveChannel,StreamConnection)
    dialogConfig.closeHandle = ()=>{
        StreamConnection.close()
    }
    const link = document.createElement("a") 
    link.textContent=receiveChannel.label
    function reloadHandle  (){
        link.textContent="重新连接"
        link.href="#"
        link.target=""
        link.onclick=()=>{
            receiveChannel.send(JSON.stringify({id:receiveChannel.label}));
            createMyWebRtc(receiveChannel,reloadHandle)
        }                            
    }
    const init = document.getElementById("init")
    init.childNodes.forEach(v=>{
        v.remove()
    })
    init.append(link)

    const Camera = document.createElement("button")

    document.getElementById("camera").append(Camera)
    Camera.textContent="开启摄像头"
    Camera.onclick = ()=>{
        getLocalStream().then(localStream=>{ 
            //const StreamConnection = createMyWebRtc( receiveChannel,reloadHandle)
            
            localStream.getTracks().forEach(track => {  
                StreamConnection.addTrack(track, localStream);    
            }); 
            createOffer(StreamConnection,receiveChannel)
            const pVideo = document.getElementById("video")
            pVideo.style.display=""
            const videoP = getVideo()
            videoP.srcObject = localStream
            getTrackShowVideo(pVideo,StreamConnection)  
             
            
            //createRTCOffer()
            Camera.textContent="⛶"
            Camera.onclick=()=>{
                //videoP.muted = false
                //videoP.play()
                toggleFullscreen();
            }       
        })
    } 

}
const checkUrlHashErr = ()=>{
    connWebRTC().then((res) =>{  
        init(res.dataChannel)   
    }).catch(e=>{
        console.log(window.location.origin)
        dialogConfig.dialogEl.showModal()
        const connUrl = document.createElement("input")
        connUrl.type = "text"
        connUrl.value = "http://192.168.1.8:3000/conn.html"
        const src = encodeURIComponent(window.location.origin+window.location.pathname)
        connUrl.onchange = (e)=>{
            connButton.href =  (e.target as HTMLInputElement).value  + "#" + src
        }
        const connButton = document.createElement("a")
        connButton.href = connUrl.value + "#" + src
        connButton.textContent="获取offer"
        document.getElementById("init").append(connUrl,connButton) 
    }) 
}
onMount(() => {   
    if (window.location.hash){
        const hashdb = window.location.hash.slice(1)
        if (hashdb){
            try{
                const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
                location.hash = ''; 
                startWebRTC(sign,(receiveChannel)=>{ 
                    init (receiveChannel)  
                })
                return
            }catch(e){
                console.log(e)
                
            } 
        }
    }
    checkUrlHashErr()   
}) 
</script>
<ShowControl  ></ShowControl>
<ConnWebrtc>
    <p id="init">   </p>
    <p id="camera"> </p>
    <p id="video" style="display:none"><VideoScreen></VideoScreen></p>
</ConnWebrtc>
