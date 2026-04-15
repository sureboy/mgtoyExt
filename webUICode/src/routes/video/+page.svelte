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
            receiveChannel.send(JSON.stringify({id,set:true,msg:{    candidate: event.candidate.toJSON()  }}));
        }else{
            console.log("ICE end")
        }
    };  
    StreamConnection.oniceconnectionstatechange=(e)=>{
        console.log(StreamConnection.connectionState)
    }
    
    const offer = await StreamConnection.createOffer();
    await StreamConnection.setLocalDescription(offer);
    receiveChannel.send(JSON.stringify({id,set:true,msg:{  offer }}));
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
onMount(() => {  
    const link = document.createElement("a")
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
})
</script>

 <Dialog {dialogConfig}   >
    <!-- 自定义内容（带超链接） -->
     
     <p id="test"> </p> 
</Dialog>
<video bind:this={localVideo}></video>