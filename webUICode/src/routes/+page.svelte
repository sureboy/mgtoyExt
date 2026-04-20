<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
 
import {startVideoPeerConn,connWebRTC,createRTCTrackConn} from '$lib/webrtc' 
import ConnWebrtc,{startConn,dialogConfig} from '$lib/ConnWebrtc.svelte';
//import {getVideo} from '$lib/Fullscreen.svelte'
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import Fullscreen,{getVideo,toggleFullscreen} from '$lib/Fullscreen.svelte'
 
async function getLocalStream() { 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            //audio:true 
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

    createRTCTrackConn(dataChannel,db,(event)=>{
         console.log(event)
        if (event.streams.length>0){
            document.getElementById("video").style.display=""
            getVideo().srcObject = event.streams[0];
            if (!dialogConfig.dialogEl?.open){
                dialogConfig.dialogEl?.showModal() 
            }
        } 
    })
   
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
const initCameraClick = (receiveChannel: RTCDataChannel,id:string)=>{
    initDataChannel(receiveChannel) 
    dataChannel = receiveChannel
    setRemoteRTC( dataChannel)
    const Camera = document.createElement("button")
    Camera.textContent="开启摄像头"
    Camera.onclick = ()=>{
        getLocalStream().then(localStream=>{ 
            document.getElementById("video").style.display="inline"
            getVideo().srcObject = localStream
            const link = document.createElement("a")
            const reloadHandle = ()=>{
                link.textContent="重新连接"
                link.href="#"
                link.target=""
                link.onclick=()=>{
                    startVideoPeerConn(localStream,receiveChannel,id,reloadHandle)
                }                            
            }
            init.append(link)
            startVideoPeerConn(
                localStream,receiveChannel,
                id,
                reloadHandle
            )   
            Camera.textContent="[]"
            Camera.onclick=()=>{
                toggleFullscreen();
            }       
        })
    } 
    const init = document.getElementById("conn")
    init.childNodes.forEach(v=>{
        v.remove()
    })
    document.getElementById("camera").append(Camera)
}
onMount(() => {   
 
    try{
        const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
        location.hash = ''; 
        startConn(sign,(receiveChannel)=>{

            initCameraClick(receiveChannel,sign.id)  
        })
    }catch(e){
        console.log(e)
        connWebRTC().then((res) =>{  
            initCameraClick(res.dataChannel,res.signaling.id)  
            //setRemoteRTC( dataChannel)
        }).catch(e=>{
            console.log(window.location.origin)
            dialogConfig.dialogEl.showModal()
            const connUrl = document.createElement("input")
            connUrl.type = "text"
            connUrl.value = "http://192.168.1.8:3000/conn.html"
            connUrl.onchange = (e)=>{
                connButton.href =  (e.target as HTMLInputElement).value  + "#"+encodeURIComponent(window.location.origin)
            }
            const connButton = document.createElement("a")
            connButton.href = connUrl.value + "#"+encodeURIComponent(window.location.origin)
            connButton.textContent="获取offer"
            document.getElementById("init").after(connUrl,connButton)
            //connButton.style.display="none"
        })
        //console.error(e)
    }
 
})
 
</script>
 

<ShowControl {handInputText}></ShowControl>
<ConnWebrtc>
    <p id="init">   </p>
    <p id="camera"> </p>
    <p id="video" style="display:none"><Fullscreen></Fullscreen></p>
</ConnWebrtc>
