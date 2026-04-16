<script lang="ts">
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import { onMount } from 'svelte'; 
import {connWebRTC,configuration} from '$lib/webrtc' 
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"MGToy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
let remoteVideo:HTMLVideoElement
let rtcChannel: RTCDataChannel= undefined
let videoWrapper:HTMLDivElement

//let videoHtml:HTMLDivElement
const createRTCConn = ( dataChannel: RTCDataChannel,db:{id:string,offer:any,candidate:any}[])=>{
    const StreamConnection = new RTCPeerConnection(configuration);  
    let id = ""    
    db.forEach(v=>{
        if (v.id && !id){
            id = v.id
        }
        if (v.offer){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(v.offer))
        }else if (v.candidate){
            StreamConnection.addIceCandidate(new RTCIceCandidate(v.candidate)).then(()=>{
                console.log(JSON.stringify(v.candidate))
            })
        }
    });
    StreamConnection.oniceconnectionstatechange=(e)=>{
        if (StreamConnection.connectionState === 'closed' ||
            StreamConnection.connectionState === 'failed' ||
            StreamConnection.connectionState==="disconnected"
        ) {
            StreamConnection.close()
            exitFullscreen()
        }
        console.log(StreamConnection.connectionState)
    }
    
    
    StreamConnection.onicecandidate = event => {
        if (event.candidate) { 
            //event.candidate.toJSON()
            dataChannel.send(JSON.stringify({id, msg:{    candidate: event.candidate.toJSON() }}));
        }else{
            console.log("ICE end")
        }
    };
    StreamConnection.ontrack =event=>{
        console.log(event)
        if (event.streams.length>0){
            remoteVideo.srcObject = event.streams[0];
            if (!dialogConfig.dialogEl?.open){
                dialogConfig.dialogEl?.showModal() 
            }
        } 
    }
    (async ()=>{
        try{
            const answer = await StreamConnection.createAnswer({ iceRestart: true });
            await StreamConnection.setLocalDescription(answer);
            dataChannel.send(JSON.stringify({id,msg:{answer}}))
        }catch(e){
            console.log(e)
        }
    })();
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
    if (id.length!=5 || !rtcChannel){
        return false
    }
    
    rtcChannel.send(JSON.stringify({id}))
    return true
}
function enterFullscreen() {
    const elem = videoWrapper;
    const requestMethod = elem.requestFullscreen  
    if (requestMethod) {
        requestMethod.call(elem).then(()=>{
            //requestWakeLock()
        }).catch(err => {
            console.warn(`全屏请求失败: ${err.message}`);
            // 降级体验: 某些移动端可能被拒绝，但提示不影响使用
            alert("无法全屏，请允许全屏权限或使用现代浏览器");
        });
    } else {
        console.warn("当前浏览器不支持全屏API");
        alert("您的浏览器不支持全屏功能");
    }    
}
function isElementFullscreen() {
    // 兼容不同浏览器的全屏元素检测
    const fullscreenElement = document.fullscreenElement  
    return fullscreenElement === videoWrapper;
}
// 退出全屏模式
function exitFullscreen() {
    const exitMethod = document.exitFullscreen  
    if (exitMethod) {
        exitMethod.call(document).catch(err => {
            console.warn(`退出全屏失败: ${err.message}`);
        });
    } else {
        console.warn("浏览器不支持退出全屏");
    }

}

// 切换全屏/窗口模式 (核心自定义全屏按钮逻辑)
function toggleFullscreen() {
    if (isElementFullscreen()) {
        exitFullscreen();
        //videoHtml.style.display = 'none'
    } else {
        //videoHtml.style.display = "block"
        enterFullscreen();
    }
}
onMount(()=>{
    document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
        // 已退出全屏
        console.log('退出全屏');
        //videoHtml.style.display = 'none'
        // 在这里执行你的自定义逻辑，例如恢复按钮图标、重置UI等
    }
    });

    //dialogConfig.dialogEl?.showModal()
    //return
    connWebRTC().then(({dataChannel}) =>{
        rtcChannel = dataChannel 
        
        
        initDataChannel(dataChannel) 
        setRemoteRTC( dataChannel)
    })
})
</script>

<ShowControl {handInputText}></ShowControl>

 
 <Dialog {dialogConfig}   >
 
<div class="video-player"> 
    <div class="video-wrapper" id="videoWrapper" bind:this={videoWrapper}>
 
        <video bind:this={remoteVideo} autoplay muted>
            您的浏览器不支持 HTML5 视频。
        </video>
 
        <div class="controls" >
  
            <!-- 自定义全屏按钮 ⛶  (点击全屏/退出全屏) -->
            <button onclick={()=>{
    toggleFullscreen()
}}  class="ctrl-btn fullscreen-btn" id="fullscreenBtn" title="全屏模式">⛶</button>
        </div>
    </div>
 </div>
</Dialog>
<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    user-select: none; /* 避免拖动时选中文字，提升按钮体验 */
}
 

/* 播放器容器 — 优雅圆角 + 柔光阴影 */
.video-player {
    max-width: 1000px;
    width: 100%;
    border-radius: 28px;
    background: #000000;
    box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
    overflow: hidden;
    transition: all 0.2s ease;
}

/* 核心包装器：flex列布局，全屏时完美撑满 */
.video-wrapper {
    display: flex;
    flex-direction: column;
    background: #000;
    width: 100%;
    position: relative;
}

/* 视频元素：流畅响应，保持原始比例，黑边优雅 */
video {
    width: 100%;
    background: #000;
    display: block;
    cursor: pointer;
    outline: none;
}

/* ========= 自定义控制栏 ========= */
.controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    background: rgba(10, 20, 30, 0.85);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    transition: all 0.2s;
    flex-wrap: wrap;
}

/* 按钮基础样式 */
.ctrl-btn {
    background: rgba(255, 255, 255, 0.12);
    border: none;
    color: #f0f3f8;
    font-size: 1.4rem;
    width: 42px;
    height: 42px;
    border-radius: 60px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.03);
}

.ctrl-btn:active {
    transform: scale(0.96);
    background: rgba(255, 255, 255, 0.3);
}
 

/* 全屏按钮单独微调 */
.fullscreen-btn {
    font-size: 1.3rem;
    width: 42px;
    background: rgba(255, 255, 255, 0.12);
}

/* 全屏模式下的容器样式 —— 占满全屏并完美展示 */
.video-wrapper:fullscreen {
    max-width: none;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    background: #000;
    display: flex;
    flex-direction: column;
}

.video-wrapper:fullscreen video {
    flex: 1;
    width: 100%;
    height: auto;
    object-fit: contain;  /* 全屏时保持完整画面，无裁剪 */
}

.video-wrapper:fullscreen .controls {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 215, 120, 0.3);
}

/* 兼容不同浏览器的全屏样式 */
.video-wrapper:-webkit-full-screen {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    display: flex;
    flex-direction: column;
}
.video-wrapper:-webkit-full-screen video {
    flex: 1;
    object-fit: contain;
}
.video-wrapper:-moz-full-screen {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
}
 

/* 移动端触摸优化 */
@media (max-width: 640px) {
    .controls {
        padding: 8px 12px;
        gap: 8px;
    }
    .ctrl-btn {
        width: 38px;
        height: 38px;
        font-size: 1.2rem;
    }
  
}
</style>
