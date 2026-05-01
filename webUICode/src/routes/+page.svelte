<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
import {getFace} from "$lib/canvasFace"
import {connWebRTC,createRtcTrack } from '$lib/webrtc' 
import ConnWebrtc,{ startWebRTC,dialogConfig} from '$lib/ConnWebrtc.svelte';
//import {getVideo} from '$lib/Fullscreen.svelte'
import ShowControl,{initDataChannel,handCmdList} from "$lib/ShowControl.svelte";
//    import CarInfo from '$lib/CarInfo.svelte';
//import VideoScreen,{getVideo,toggleFullscreen} from '$lib/Fullscreen.svelte'
type myWebRtcConf  = {
    dataChannel: RTCDataChannel,
    StreamConnection?:RTCPeerConnection,
    myDataChannel?:RTCDataChannel,
}
const showDialog = ()=>{
    dialogConfig.dialogEl?.show()
    Object.assign(dialogConfig.dialogEl.style, {
        position: 'static',      /* 回归文档流 */
        display: 'block',       /* 块级元素 */
        margin: '0',          /* 重置默认边距 */
        border: 'none',          /* 移除边框 */
        padding: '0'  ,         /* 移除内边距 */
        background: 'none',      /* 透明背景 */
        color: 'inherit',        /* 继承字体颜色 */
        width: 'auto',           /* 自适应宽度 */
        height: 'auto'
    })
}
async function getLocalStream(facingMode:ConstrainDOMString ) { 
    try {
        const localStream = await navigator.mediaDevices.getUserMedia({ 
            video:{facingMode},// (cameraNumber<=cameraID)?true:{ deviceId: { exact: videoDevices[cameraID].deviceId } },
            audio:{
                echoCancellation: true,   // 开启回声消除
                noiseSuppression: true,   // 建议同时开启降噪
                autoGainControl: true     // 建议同时开启自动增益
            }, 
        });
        console.log('使用摄像头'); 
        return {localStream };
    } catch (error) { 
        alert(error)
        //console.log(error)
        //return;
        //return undefined;
        //console.log( error);
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
            return {localStream:localVideo.captureStream()}
        }catch(e){
            console.log(e)
            //return undefined
        } 
    }
}
  
 
const getTrackShowVideo = ( StreamConnection:RTCPeerConnection)=>{ 
    const finalStream = new MediaStream();
    let has = false
    
    StreamConnection.ontrack = (e)=>{ 
        finalStream.addTrack(e.track)
        if (!has){
            has = true 
            createVideo(finalStream) 
        }
    }
} 
const createMyWebRtc = (conf:myWebRtcConf,closeHand?:()=>void)=>{
    conf.StreamConnection = createRtcTrack((candidate: RTCIceCandidateInit)=>{
        conf.dataChannel.send(JSON.stringify({id:conf.dataChannel.label,msg:{candidate}}))
    },closeHand)
    dialogConfig.closeHandle = ()=>{
        conf.StreamConnection.close()
        closeHand()
        const vp = document.getElementById("video")

        vp?.childNodes.forEach(v=>{
            console.log(v)
            const videoc = (v as HTMLVideoElement)
            videoc.remove()             
        })
        vp.innerHTML=""
        //navigator.mediaDevices.dispatchEvent()
    }
    conf.dataChannel.send(JSON.stringify({id:conf.dataChannel.label}))
    let heartbeat = 0;
    conf.myDataChannel = conf.StreamConnection.createDataChannel(conf.dataChannel.label,{ordered:false})
    conf.myDataChannel.onopen=()=>{
        heartbeat = performance.now();
        conf.myDataChannel.send(JSON.stringify({heartbeat}));
        const timeout = setInterval(()=>{
            if (performance.now()-heartbeat >10000){
                clearInterval(timeout);
                //StreamConnection.close();
                console.log("time Out");
                conf.StreamConnection.close();
                closeHand();
            }else{
                try{
                    conf.myDataChannel.send(JSON.stringify({heartbeat}));
                }catch(e){
                    clearInterval(timeout);
                    conf.StreamConnection.close();
                    closeHand();
                    console.log(e);
                }
                
            }
        },3000);
        conf.StreamConnection.onicecandidate = event=>{
            if (event.candidate) { 
                conf.myDataChannel.send(JSON.stringify( event.candidate.toJSON() ));
            }
        };
        conf.StreamConnection.onnegotiationneeded = (e)=>{
            createOffer(conf.StreamConnection).then(sdp=>{
                //conf.StreamConnection.setLocalDescription(sdp).then(()=>{
                conf.myDataChannel.send(JSON.stringify(conf.StreamConnection.localDescription.toJSON()));
                //});                 
            });        
        }
        conf.myDataChannel.addEventListener("message",e=>{
            const obj = JSON.parse(e.data);
            if (obj.heartbeat){ 
                heartbeat = performance.now(); 
                return;
            }
        }) 
    }
    conf.myDataChannel.onmessage = e=>{
        console.log(e.data); 
        const obj = JSON.parse(e.data);
        /*
        if (obj.heartbeat){
            heartbeat = performance.now();
            return;
        }*/
        if (obj.candidate){
            conf.StreamConnection.addIceCandidate(new RTCIceCandidate(obj.candidate)).then(()=>{
                console.log(JSON.stringify(obj.candidate));
            });
            return;
        }
        if (obj.sdp){
            conf.StreamConnection.setRemoteDescription(new RTCSessionDescription(obj));
            if (obj.type==="offer"){
                conf.StreamConnection.createAnswer().then(sdp=>{
                    conf.StreamConnection.setLocalDescription(sdp);
                    conf.myDataChannel.send(JSON.stringify(sdp));
                })
            }
            return
        }
        if (obj.click){
            console.log(obj.click)
            document.getElementById(obj.click)?.click()
            return
        }

    };
    conf.StreamConnection.ondatachannel = (e)=>{
        e.channel.onmessage = conf.myDataChannel.onmessage
        e.channel.addEventListener("message",ev=>{
            const obj = JSON.parse(ev.data);
            if (obj.heartbeat){
                e.channel.send(ev.data)
                //heartbeat = performance.now();
                return;
            }
        })
        conf.myDataChannel = e.channel
    }
    conf.StreamConnection.onnegotiationneeded = (e)=>{
        createOffer(conf.StreamConnection).then(sdp=>{
            //conf.StreamConnection.setLocalDescription(sdp).then(()=>{
                conf.dataChannel.send(JSON.stringify({id:conf.dataChannel.label,msg:{sdp}}))
            //});             
        });        
    }
    getTrackShowVideo(conf.StreamConnection) /*
    StreamConnection.onicecandidate = (e)=>{
        //console.log(e.candidate,dataChannel.label)
        if (e.candidate){
            dataChannel.send(
                JSON.stringify({id:dataChannel.label, msg:{    candidate: e.candidate.toJSON() }}));
        }
    }
*/
    //return StreamConnection
}
async function requestWakeLock() {

    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('唤醒锁已激活，屏幕将保持常亮');
            wakeLock.addEventListener('release', () => {
                console.log('唤醒锁被释放');
            });
            //return wakeLock
        } catch (err) {
            console.error(`无法获取唤醒锁: ${err.name}, ${err.message}`);
        }
    //}else{
        //alert("您的浏览器不支持唤醒锁");
    }
}
 
const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
    //const StreamConnection = createMyWebRtc(dataChannel,closeHand)
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (capabilities) {
        // 从返回结果的 codecs 数组中查找 VP8
        const vp8Codec = capabilities.codecs.find(c => c.mimeType === 'video/VP8'); 
        if (vp8Codec) { 
            StreamConnection.getTransceivers().forEach(transceiver => {
                if (transceiver.sender && transceiver.sender.track?.kind === 'video') {
                    transceiver.setCodecPreferences([vp8Codec]);
                }
            });
        }
    }
    const sdp  = await StreamConnection.createOffer() 
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp)
    return sdp
 
}

const createVideo = (finalStream?: MediaStream)=>{
    const v = document.getElementById("video")
    //let video_self:HTMLVideoElement
    if (v.childElementCount>0){
        const video =  v.firstChild as HTMLVideoElement 
        if (finalStream){
            video.srcObject = finalStream
        }
        return video
    } 
    const video_self = document.createElement("video")
    v.append(video_self) 
    if (finalStream){ 
        video_self.srcObject = finalStream
        //faceStop();
    } else{
        const faceStop = getFace(video_self) 
        //video_self.addEventListener("")
        const videoRemove = video_self.remove
        video_self.remove = ()=>{
            faceStop();
            videoRemove.bind(video_self);
        }
    }
    video_self.muted = true;
    video_self.controls=true;
    video_self.autoplay = true;
    video_self['playsinline'] = true;
    video_self["webkit-playsinline"]=true;
    video_self['disableremoteplayback']=true
    video_self['disablepictureinpicture']=true
    video_self.height = 300;
    video_self.width = 200;
    
    //video_self.poster="./logo.png"
    return video_self
    //video_self.srcObject = localStream
}
 
const initDC = (conf:myWebRtcConf )=>{
    //let StreamConnection:RTCPeerConnection = undefined
    
    conf.dataChannel.addEventListener("message",(e)=>{
        const db = JSON.parse(e.data)
        //console.log("initDC",db)
        if (!db.id || !db.msg){
            return
        }
        if (!dialogConfig.dialogEl.open){
            showDialog() 
        } 

        
        if (!conf.StreamConnection || conf.StreamConnection.signalingState==="closed"){
            createMyWebRtc(conf, ()=>{
                conf.StreamConnection=undefined
            })
            const camera = document.getElementById("camera")
            //camera.innerHTML = ""
            const changecamera = document.createElement("button")
            changecamera.textContent="切换摄像头"
            changecamera.onclick = (e)=>{
                conf.myDataChannel.send(JSON.stringify({click:"cameraClick"}))
            }
            camera.append(changecamera)
        }
        if (db.msg.sdp){ 
            conf.StreamConnection.setRemoteDescription(new RTCSessionDescription(db.msg.sdp))
            if (db.msg.sdp.type==="offer"){
                
                conf.StreamConnection.onicecandidate = (e)=>{
                    console.log(e.candidate,db.id)
                    if (e.candidate){
                        conf.dataChannel.send(
                            JSON.stringify({id:db.id, msg:{    
                                candidate: e.candidate.toJSON() }}));
                    }
                }
                //conf.StreamConnection.restartIce()
                conf.StreamConnection.createAnswer({ iceRestart: true }).then(
                    sdp=>{ 
                    conf.StreamConnection.setLocalDescription(sdp)
                    conf.dataChannel.send(JSON.stringify({id:db.id,msg:{sdp}}))
                    //console.log("answer",sdp)
                })
            }
        }
        if (db.msg.candidate){
            conf.StreamConnection.addIceCandidate(new RTCIceCandidate(db.msg.candidate))
        }          
    })
}
const init = (receiveChannel: RTCDataChannel )=>{
    window.addEventListener('beforeunload', function (e) { 
        e.preventDefault(); 
    }) 
    if (dialogConfig.dialogEl?.open){
        dialogConfig.dialogEl.close()
        
    }
    //dialogConfig.dialogEl.show()
    showDialog()
    initDataChannel(receiveChannel)   
    const conf:myWebRtcConf = { dataChannel:receiveChannel} 
    initDC(conf) 
    const link = document.createElement("a") 
    link.textContent=receiveChannel.label
    function reloadHandle  (){
        conf.StreamConnection=undefined
        link.textContent="重新连接"
        link.href="#"
        link.target=""
        link.onclick=()=>{
            link.textContent = receiveChannel.label 
            Camera.click()
        }                      
    }
    const init = document.getElementById("init")
    init.innerHTML=''
 
    init.append(link)

    const Camera = document.createElement("button")

    const cam = document.getElementById("camera")
    cam.innerHTML=''
    let facingMode:"user"| { exact: "environment" } =  { exact: "environment" }
    cam.append(Camera)
    Camera.textContent=`摄像头`
    const containerStream = new MediaStream();
    Camera.onclick = ()=>{
        if (!conf.StreamConnection){
            createMyWebRtc(conf,reloadHandle)
        }
          
        requestWakeLock()
        containerStream.getTracks().forEach(t=>{
            if (t.kind==="video"){
                t.stop()
                containerStream.removeTrack(t)
            }
        })
        getLocalStream(facingMode).then(({localStream})=>{  
            const senders = conf.StreamConnection.getSenders();
            localStream.getTracks().forEach(track => {  
                const videoSender = senders.find(sender => sender.track && sender.track.kind === track.kind);
                if (!videoSender) {
                    containerStream.addTrack(track)
                    conf.StreamConnection.addTrack(track, containerStream); 
                }else{
                    if (track.kind==="audio"){
                        return
                    }
                    containerStream.addTrack(track)
                    videoSender.track.stop()
                    videoSender.replaceTrack(track);
                } 
            });  
            
            const AudioCamera = document.createElement("button")
            AudioCamera.textContent=`静音`
            AudioCamera.id="audioClick"
            AudioCamera.onclick=()=>{
                const videoSender = conf.StreamConnection.getSenders().find(s => s.track.kind === 'audio'); 
                videoSender.track.enabled=false 
            }  
            cam.innerHTML=''  
            cam.append(AudioCamera)   
             
            //if (cameraNumber && cameraNumber>0){ 
                if (facingMode==="user"){
                    facingMode = { exact: "environment" }
                }else{
                    facingMode ="user"
                } 
                cam.append(Camera)   
                Camera.textContent=`切换镜头`
                Camera.id = "cameraClick"
              
            //} 
            //document.createElement("video")
            //const v = document.getElementById("video")
             createVideo()
            
            //videoR.
            //videoR.srcObject = finalStream
            //v.append(videoR)
        })
    } 

}
const checkUrlHashErr = ()=>{
    connWebRTC().then((res) =>{  
        init(res.dataChannel)   
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
        connButton.textContent="连接"
        document.getElementById("init").append(connUrl,connButton) 
    }) 
}
handCmdList.unshift((v)=>{
    if (v==="video"){
        if (!dialogConfig.dialogEl?.open){

            showDialog()
        }
        return true
    }
    return false
})
onMount(() => {   

    document.body.addEventListener("touchmove",(e)=>{
         e.preventDefault();
    },{ passive: false })
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
    checkUrlHashErr()   

}) 
</script>
<ShowControl  >
    <ConnWebrtc>
        <p id="init">   </p>
        <p id="camera"> </p>
        <p id="video" > </p>
    </ConnWebrtc>
</ShowControl>

