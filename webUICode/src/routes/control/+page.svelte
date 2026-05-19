<script lang="ts">  
import BlinkEyes from '$lib/components/BlinkEyes.svelte';
import InfoPanel,{dialogConfig,meshList} from "$lib/components/InfoPanel.svelte";
import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte"
import {handleOffer,configuration,createOffer} from '$lib/webrtc' 
//import {connWebRTC ,createRtcTrack,createOffer} from '$lib/webrtc'
//import ConnWebrtc,{ startWebRTC} from '$lib/ConnWebrtc.svelte'; 
import type {infoStruct,signalingStruct} from "$lib/utils/mainDataStruct" 
import {createCmdSender} from "$lib/utils/wheelCmdSender"
import type {InfoType} from '$lib/components/InfoPanel.svelte'
import {setRemoteRTCMsg} from "$lib/utils/postAndSSEWebrtc"
//    import { clearInterval } from 'node:timers';
//let canvas:HTMLCanvasElement
let sender:(n:number)=>void = undefined
const infoData:infoStruct= {cars:[]}
let mainArea:HTMLDivElement 
 
const init = (dc: RTCDataChannel,pc: RTCPeerConnection)=>{
    //InfoPanelMenu.conn=false
    //dialogConfig.dialogEl?.close()
    //initDataChannelListener(dataChannel) 
    //initDataChannelSender(dataChannel) 
    const dcconfig:InfoType = {
        id:dc.label,
        //localStream:new MediaStream(),
        //children:[], 
        pc,
        dc, 
        setSender:(db:any)=>{
            sender = msg=>{ 
                dc.send(JSON.stringify(Object.assign({msg},db)))
            }        
        }        
    }
 
    for (let i=0;i<meshList.length;i++){
        const v = meshList[i]
        if (v.id ===dcconfig.id){
            meshList[i] = dcconfig
            return
        }
    }
    meshList.push(dcconfig)
 
    //console.log(InfoPanelMenu)

}
const startWebRTC = (sign:signalingStruct,conn:(
    dc:RTCDataChannel,
    pc: RTCPeerConnection)=>void)=>{
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
        dialogConfig.dialogEl?.close()
        peerConnection.onnegotiationneeded = ()=>{
            createOffer(peerConnection).then(sdp=>{
                receiveChannel.send(JSON.stringify(sdp));
            });
        }
        receiveChannel.addEventListener('message',(ev)=>{
            try{
                setRemoteRTCMsg(JSON.parse(ev.data),{pc:peerConnection,dc:receiveChannel})
            }catch(e){
                console.error(e)
            }            
        })
        conn(receiveChannel,peerConnection) 
    })
}
onMount(()=>{ 
 
    if (window.location.hash){
        const hashdb = window.location.hash.slice(1)
        if (hashdb){
            try{
                const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
                location.hash = ''; 
                startWebRTC(sign,init)
                return
            }catch(e){
                console.log(e) 
            } 
        }
    }
})
</script>
 
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