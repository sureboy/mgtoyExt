<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
import {handleOffer} from '$lib/webrtc';
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import {configuration} from '$lib/webrtc' 
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"SolidJScad",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
 
let localVideo:HTMLVideoElement
let wakeLock = null;
let videoWrapper:HTMLDivElement
// 请求唤醒锁的函数
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('唤醒锁已激活，屏幕将保持常亮');
      wakeLock.addEventListener('release', () => {
        console.log('唤醒锁被释放');
      });
    } catch (err) {
      console.error(`无法获取唤醒锁: ${err.name}, ${err.message}`);
      
    }
  }else{
    alert("您的浏览器不支持唤醒锁");
  }
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
         if (wakeLock) {
            wakeLock.release().then(() => wakeLock = null);
        }
         
        //videoHtml.style.display = 'none'
    } else {
        //videoHtml.style.display = "block"
        enterFullscreen();
         requestWakeLock()
    }
}
async function getLocalStream() { 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('使用摄像头');
        return stream;
    } catch (error) { 
        //return undefined;
        console.log('摄像头不可用，播放默认视频文件', error);
        try{
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
            return undefined
        } 
    }
}
const startVideoPeerConn =async (localStream: MediaStream,receiveChannel: RTCDataChannel,id:string)=>{
    
    const StreamConnection = new RTCPeerConnection(configuration); 
    localStream.getTracks().forEach(track => { 
        console.log(track)
        //if (track.kind==="video"){
            StreamConnection.addTrack(track, localStream);
        //}
        
    });  
    StreamConnection.onicecandidate = event => {
        //console.log(event)
        if (event.candidate) { 
            //event.candidate.toJSON()
            receiveChannel.send(JSON.stringify({id,set:true,msg:{ id,   candidate: event.candidate.toJSON()  }}));
        }else{
            console.log("ICE end")
        }
    };  
    StreamConnection.oniceconnectionstatechange=(e)=>{
        if (StreamConnection.connectionState === 'closed' ||
            StreamConnection.connectionState === 'failed' ||
            StreamConnection.connectionState==="disconnected"
        ) {
            StreamConnection.close();
            link.textContent="重新连接"
            link.href=""
            link.onclick=()=>{
                startVideoPeerConn(localStream,receiveChannel,id)
            }
    
        }
        //if (StreamConnection.connectionState === 'closed')
        console.log(StreamConnection.connectionState)
    }
    
    const offer = await StreamConnection.createOffer();
    await StreamConnection.setLocalDescription(offer);
    receiveChannel.send(JSON.stringify({id,set:true,msg:{ id, offer }}));
    receiveChannel.onmessage = (event) => {
        
        const db = JSON.parse(event.data) as { candidate?:RTCIceCandidateInit,answer?:RTCSessionDescriptionInit}
        if (db.candidate){
            console.log(`get ICE: ${db.candidate}`) 
            //await StreamConnection.setRemoteDescription(new RTCSessionDescription({sdp:sign.offer,type:"offer"}));
            StreamConnection.addIceCandidate(new RTCIceCandidate(db.candidate)).then(()=>{
                console.log(JSON.stringify(db.candidate))
            })
        }else if (db.answer){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(db.answer))
        }
    };  
}
let link:HTMLAnchorElement=undefined
onMount(() => {  
    //link = document.createElement("a")
    link.target="_blank"
    link.textContent = "请求连接"
    link.rel = "opener"
    if (!window.location.hash ){
        return;
    }
    try{
        const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
        location.hash = ''; 
        const peerConnection = new RTCPeerConnection(configuration);

        console.log(sign)
        handleOffer(sign,peerConnection,(answer)=>{
            const ans = JSON.stringify(answer)
            //console.log(ans)
            

            link.href=sign.backUrl+"#"+encodeURIComponent(ans)
            document.getElementById("test")?.appendChild(link)
            dialogConfig.dialogEl?.showModal()
            //link.click();
            return
        },(receiveChannel)=>{ 
            
            receiveChannel.onopen = (e)=>{
                console.log("open",e)
                //dialogConfig.dialogEl?.close(); 
                //document.getElementById("test")?
                //const p = document.createElement("p")
                link.textContent = sign.id
                link.href="#"
       
                //document.getElementById("test")?.replaceChild(p,link)
                getLocalStream().then(localStream=>{
                    
                    console.log("lstream",localStream)
                    if (localStream){
                        startVideoPeerConn(localStream,receiveChannel,sign.id)
                         
                    }  else{
                    
                    }            
                })
            }
        });
    
    }catch(e){
        console.error(e)
    }

    return ()=>{
        if (wakeLock) {
            wakeLock.release().then(() => wakeLock = null);
        }
    }
})
</script>

<Dialog {dialogConfig}   > 
  <p>  <a bind:this={link} href="/">test </a> </p>
    <button onclick={()=>{ 
        toggleFullscreen()
     }}>全屏</button>
</Dialog>
<div class="video-wrapper" id="videoWrapper" bind:this={videoWrapper}>
<video bind:this={localVideo}></video>
</div>