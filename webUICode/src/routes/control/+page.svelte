<script lang="ts">  
import BlinkEyes from '$lib/components/BlinkEyes.svelte';
import InfoPanel,{dialogConfig} from "$lib/components/InfoPanel.svelte";
import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte"
import {handleOffer,configuration} from '$lib/webrtc' 
//import {connWebRTC ,createRtcTrack,createOffer} from '$lib/webrtc'
//import ConnWebrtc,{ startWebRTC} from '$lib/ConnWebrtc.svelte'; 
import type {infoStruct,signalingStruct} from "$lib/utils/mainDataStruct" 
import {createCmdSender} from "$lib/utils/wheelCmdSender"

//import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
//    import { clearInterval } from 'node:timers';
//let canvas:HTMLCanvasElement
let sender:(n:number)=>void = undefined
const infoData:infoStruct= {cars:[]}
let mainArea:HTMLDivElement 
const initDataChannelListener = (dataChannel: RTCDataChannel)=>{
    dataChannel.addEventListener("message",(e)=>{
        //console.log(e)
        const db = JSON.parse(e.data)
        if (db.DB && db.DB.Carname){
            const car = {name:db.DB.Carname}
            const timeOut = (Date.now() - db.Update)/6000
            let car_ = document.getElementById(db.DB.Carname) as HTMLAnchorElement
            if (!car_){
                car_=infoData.info.firstChild.cloneNode() as HTMLAnchorElement;// document.createElement('a')
                car_.href="#"+car.name
                car_.id = car.name
                car_.onclick = ()=>{
                    infoData.codeInput.value = JSON.stringify(car)
                }
                infoData.info.append(car_)
            }
            console.log(timeOut)
            if (timeOut>=1){
                car_.textContent = car.name
            }else{
                car_.textContent=car.name+":"+(100-timeOut  *100).toFixed(0) +"%"
            } 
        }
        console.log(db,infoData.info) 
    }) 
}
const initDataChannelSender = (dataChannel: RTCDataChannel)=>{
    dataChannel.send(JSON.stringify({  
        name:"local" ,
        msg: 0
    }))
    sender= n=>{ 
        dataChannel.send(JSON.stringify(
            Object.assign(
                {msg:n},
                JSON.parse(infoData.codeInput.value)
            )   
        ))
    } 
}
const init = (dataChannel: RTCDataChannel)=>{
    initDataChannelListener(dataChannel) 
    initDataChannelSender(dataChannel) 
}
const startWebRTC = (sign:signalingStruct,conn:(dc:RTCDataChannel)=>void)=>{
    const peerConnection = new RTCPeerConnection(configuration); 
    const link = document.createElement("a")
    handleOffer(sign,peerConnection,(answer)=>{ 
        link.target="_blank"
        link.textContent = "确定"
        link.rel = "opener"
        link.onclick=()=>{link.textContent="..."}
        link.href=sign.backUrl+"#"+encodeURIComponent(JSON.stringify(answer))
        dialogConfig.content.appendChild(link)
        dialogConfig.dialogEl?.showModal()
        //link.click()
    },(receiveChannel)=>{ 
        dialogConfig.content.innerHTML="" 
        conn(receiveChannel) 
    })
}
onMount(()=>{ 
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
})
</script>
<svelte:head><title  >mgtoy</title></svelte:head> 
<div class="bg" bind:this={mainArea} ><BlinkEyes></BlinkEyes></div>
 
<Joystick clickEvent={createCmdSender((n)=>{
    //console.log( n]]);
    if (sender)sender(n)
})}></Joystick>
<InfoPanel  ></InfoPanel>
<footer>🎥 摄像头视频背景 | 半透明摇杆 | 拖拽右下角 → 8方向 + 中心停止</footer> 
<style>
footer {
    position: fixed;
    bottom: 12px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: #ccc;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    padding: 6px;
    z-index: 99;
    pointer-events: none;
    font-weight: 400;
}
 
/* 视频全屏背景层 */
.bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;   /* 覆盖全屏，保持比例裁剪 */
    z-index: 1;
    
}

 
</style>