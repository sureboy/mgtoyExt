<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
 
import {createRTCTrackAnswer ,connWebRTC,createRTCTrackOffer } from '$lib/webrtc' 
import ConnWebrtc,{startConn,dialogConfig} from '$lib/ConnWebrtc.svelte';
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

let dataChannel: RTCDataChannel 
//let Camera:HTMLButtonElement
const createRTCConn = ( dataChannel: RTCDataChannel,db:{id:string,offer:any,candidate:any}[])=>{
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
    const pc = createRTCTrackAnswer(dataChannel,db,(event)=>{ 
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
const setRemoteRTC = ( dataChannel: RTCDataChannel)=>{
    const oldHandleMsg =dataChannel.onmessage
    dataChannel.onmessage = (e)=>{
        const db = JSON.parse(e.data)
        //console.log(db)
        if (Array.isArray(db)){ 
            createRTCConn( dataChannel,db)
            return;
        }
        oldHandleMsg?.call(dataChannel,e)
    }
    
}
const handInputText =(id:string)=>{
    if (id.length!=5 || !dataChannel){
        return false
    }
    
    dataChannel.send(JSON.stringify({id}))
    return true
}
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
const initCameraClick = (receiveChannel: RTCDataChannel,id:string)=>{
    initDataChannel(receiveChannel) 
    dataChannel = receiveChannel
    setRemoteRTC( dataChannel)
    const Camera = document.createElement("button")
    const init = document.getElementById("init")
    init.childNodes.forEach(v=>{
        v.remove()
    })
    document.getElementById("camera").append(Camera)
    Camera.textContent="开启摄像头"
    Camera.onclick = ()=>{
        getLocalStream().then(localStream=>{ 
            const pVideo = document.getElementById("video")
            pVideo.style.display=""
            const videoP = getVideo()
            videoP.srcObject = localStream
            const link = document.createElement("a")
            function createRTCOffer(){
                createRTCTrackOffer(localStream,receiveChannel,id,reloadHandle).then(({StreamConnection})=>{
                    dialogConfig.closeHandle = ()=>{
                        StreamConnection.close()
                    }
                    link.textContent=id
                    getTrackShowVideo(pVideo,StreamConnection)  
                })
            }
            //link.textContent=id
            function reloadHandle  (){
                link.textContent="重新连接"
                link.href="#"
                link.target=""
                link.onclick=()=>{
                    createRTCOffer()
                }                            
            }
            init.append(link)
            createRTCOffer()
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
        initCameraClick(res.dataChannel,res.signaling.id)   
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
                startConn(sign,(receiveChannel)=>{ 
                    initCameraClick(receiveChannel,sign.id)  
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
<ShowControl {handInputText}></ShowControl>
<ConnWebrtc>
    <p id="init">   </p>
    <p id="camera"> </p>
    <p id="video" style="display:none"><VideoScreen></VideoScreen></p>
</ConnWebrtc>
