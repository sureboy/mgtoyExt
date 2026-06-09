<script lang="ts">  
//import BlinkEyes from '$lib/components/BlinkEyes.svelte';
import InfoPanel,{dialogConfig,addMesh,localDevice} from "$lib/components/InfoPanel.svelte";
//import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte"
import {handleOffer,createOffer} from '$lib/webrtc' 
//import {connWebRTC ,createRtcTrack,createOffer} from '$lib/webrtc'
//import ConnWebrtc,{ startWebRTC} from '$lib/ConnWebrtc.svelte'; 
import type {signalingStruct} from "$lib/utils/mainDataStruct" 
//import {createCmdSender} from "$lib/utils/wheelCmdSender"
import type {meshInfoType} from '$lib/components/Mesh.svelte'
import {setRemoteRTCMsg,createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import {pool} from "$lib/utils/webRTCPool"
import type {connType} from "$lib/utils/webRTCPool"
//    import { clearInterval } from 'node:timers';
//let canvas:HTMLCanvasElement
let sender:(msg:any)=>void = undefined
//const infoData:infoStruct= {cars:[]}
let mainArea:HTMLDivElement 
//let mgtoyTitle = $state("mgtoy")
const init = (conn:connType)=>{
    //InfoPanelMenu.conn=false
    //dialogConfig.dialogEl?.close()
    //initDataChannelListener(dataChannel) 
    //initDataChannelSender(dataChannel) 
    const dcconfig:meshInfoType = {
        conn , 
        setSender:function(db:any){  
            sender = msg=>{ 
                conn.dc.send(JSON.stringify(Object.assign(msg,db)))
            }  
        }        
    }
    //mgtoyTitle = dcconfig.conn.id +"-mgtoy"
    


    //conn.onClose = ()=>{
    //    console.log("----",dcconfig)
    //}
    addMesh(dcconfig)
 
    //console.log(InfoPanelMenu)

}
const startWebRTC = (sign:signalingStruct,HandleConn:(
    conn_: connType)=>void)=>{
    const conn = pool.createConnection(sign.id)// new RTCPeerConnection(configuration); 
    const {pc} = conn
    const link = document.createElement("a")
    link.textContent='...'
    dialogConfig.dialogEl?.showModal()
    dialogConfig.content.append(link)
    handleOffer(sign,pc,(answer)=>{ 
        link.target="_blank"
        link.textContent = "确定"
        link.rel = "opener"
        link.onclick=()=>{link.textContent="..."}
        link.href=sign.backUrl+"#"+encodeURIComponent(JSON.stringify(answer))
        
        
        //link.click()
    },(receiveChannel)=>{ 
        if (receiveChannel.label==="file"){
            return
        }
        conn.dc = receiveChannel
        dialogConfig.content.innerHTML=""  
        dialogConfig.dialogEl?.close()
        pc.onnegotiationneeded = ()=>{
            createOffer(pc).then(sdp=>{
                receiveChannel.send(JSON.stringify(sdp));
            });
        }
        receiveChannel.addEventListener('message',(ev)=>{
            try{
                setRemoteRTCMsg(JSON.parse(ev.data),{pc,dc:receiveChannel})
            }catch(e){
                console.error(e)
            }            
        })
        console.log(receiveChannel)
        HandleConn(conn) 
    })
}
 
onMount(()=>{  
    if (window.location.hash){
        const hashdb = window.location.hash.slice(1)
        if (hashdb){
            try{
                const opt = JSON.parse(decodeURIComponent(window.location.hash.slice(1)))
                if (opt.connid){
                    console.log(opt)
                    createWebrtcConnFromCenterUrl({
                        id:opt.connid,
                        create:false,
                        //host:"http://192.168.1.8:8088"
                        host:opt.host||"https://www.zaddone.com/rtc"
                    },conn=>{
                        addMesh({conn})})
                    return
                }
                const sign =opt  as signalingStruct
                location.hash = ''; 
                startWebRTC(sign,init)
                return
            }catch(e){
                console.log(e) 
            } 
        }
    }
    mainArea.append
})
</script>
 
<div class="bg" bind:this={mainArea} >
    
    
</div>
  
<InfoPanel fillMainArea={(...nodes: (Node | string)[])=>{
    mainArea.innerHTML=""
    mainArea.append(...nodes)
    }} ></InfoPanel>
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