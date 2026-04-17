<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
 
import {startVideoPeerConn} from '$lib/webrtc' 
import ConnWebrtc,{startConn} from '$lib/ConnWebrtc.svelte';
import {getVideo} from '$lib/Fullscreen.svelte'
 
 
 
async function getLocalStream() { 
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('使用摄像头');
        return stream;
    } catch (error) { 
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


onMount(() => {   
    if (!window.location.hash ){
        return;
    }
    try{
        const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
        location.hash = ''; 
        startConn(sign,(receiveChannel,link)=>{
             getLocalStream().then(localStream=>{
                //console.log("lstream",localStream)
                //if (localStream){
                getVideo().srcObject = localStream

                const reloadHandle = ()=>{
                    link.textContent="重新连接"
                    link.href="#"
                    link.target=""
                    link.onclick=()=>{
                        startVideoPeerConn(localStream,receiveChannel,sign.id,reloadHandle)
                    }                            
                }
                startVideoPeerConn(
                    localStream,receiveChannel,
                    sign.id,
                    reloadHandle
                )
                        
                //}  else{
                
                //}            
            })
        })
    }catch(e){console.error(e)}
 
})

let urltest:HTMLAnchorElement
</script>
<input type="text" value="http://192.168.1.8:3000/conn.html" onchange={(e)=>{ 
    urltest.href =  (e.target as HTMLInputElement).value  
}} />
<a href="http://192.168.1.8:3000/conn.html"    bind:this={urltest} >test</a>
<ConnWebrtc></ConnWebrtc>
 