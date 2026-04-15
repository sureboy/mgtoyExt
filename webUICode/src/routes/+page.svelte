<script lang="ts">
//import {jsonToHash,hashToJson} from "$lib/hashTOJson"
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import { onMount } from 'svelte';
import {handleOffer} from '$lib/webrtc';
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import type {signalingStruct} from '$lib/utils/util';
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"SolidJScad",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
 
let localVideo:HTMLVideoElement|undefined = $state(undefined)
let showControlUI = $state(false)
async function getLocalStream() {
  // 1. 优先尝试获取摄像头
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
 
onMount(() => {  
    if (window.location.hash   ){
        try{
            const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
            const peerConnection = new RTCPeerConnection(configuration);
            getLocalStream().then(localStream=>{
                if (localStream){
                    localStream.getTracks().forEach(track => { 
                        peerConnection.addTrack(track, localStream);
                    });
                    showControlUI = false
                }  else{
                    showControlUI = true
                }            
                handleOffer(sign,peerConnection,(answer)=>{
                    const ans = JSON.stringify(answer)
                    //console.log(ans)
                    const link = document.createElement("a")
                    link.target="_blank"
                    link.textContent = "请求连接"
                    link.rel = "opener"
                    link.href=sign.backUrl+"#"+encodeURIComponent(ans)
                    document.getElementById("test")?.appendChild(link)
                    dialogConfig.dialogEl?.showModal()
                    //link.click();
                    return
                },(receiveChannel)=>{
                    if (showControlUI){
                        initDataChannel(receiveChannel)
                    } else{
                        receiveChannel.onmessage = (event) => {
                            console.log(`对方: ${event.data}`)
                            //dialogConfig.dialogEl?.close();
                            //messages = [...messages, `对方: ${event.data}`];
                        };
                    }
                    receiveChannel.onopen = (e)=>{
                        console.log("open",e)
                        dialogConfig.dialogEl?.close(); 
                    }
                    
                
                });
            }) 
        
        }catch(e){
            console.error(e)
        } 
        location.hash = '';       
    } 
});
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};
 

</script>
{#if showControlUI}
 
<ShowControl></ShowControl>
{:else}
<video bind:this={localVideo}></video>
{/if}
 <Dialog {dialogConfig}   >
    <!-- 自定义内容（带超链接） -->
     
     <p id="test"> </p> 
</Dialog>