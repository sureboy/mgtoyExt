<script lang="ts">
import { onMount } from 'svelte';
import type {signalingStruct} from '$lib/utils/util'
 
import {connWebRTC,createRtcTrack } from '$lib/webrtc' 
import ConnWebrtc,{ startWebRTC,dialogConfig} from '$lib/ConnWebrtc.svelte';
//import {getVideo} from '$lib/Fullscreen.svelte'
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
//    import CarInfo from '$lib/CarInfo.svelte';
//import VideoScreen,{getVideo,toggleFullscreen} from '$lib/Fullscreen.svelte'
 
async function getLocalStream(facingMode:ConstrainDOMString ) { 
    try {
        //const devices = await navigator.mediaDevices.enumerateDevices();
        //const videoDevices = devices.filter(device => device.kind === 'videoinput');
        // 假设 videoDevices[0] 是前置, videoDevices[1] 是后置。保存它们的 deviceId
        //const frontCameraId = videoDevices[0].deviceId;
        //const backCameraId = videoDevices[1].deviceId;
        //if (videoDevices.length<=cameraID)
        //const cameraNumber = 0//videoDevices.length
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
const createMyWebRtc = (dataChannel: RTCDataChannel,closeHand?:()=>void)=>{
    const StreamConnection = createRtcTrack((candidate: RTCIceCandidateInit)=>{
        dataChannel.send(JSON.stringify({id:dataChannel.label,msg:{candidate}}))
    },closeHand)
    dialogConfig.closeHandle = ()=>{
        StreamConnection.close()
    }
    dataChannel.send(JSON.stringify({id:dataChannel.label}))
    let heartbeat = 0;
    let dc = StreamConnection.createDataChannel(dataChannel.label,{ordered:false})
    dc.onopen=()=>{
        heartbeat = performance.now();
        dc.send(JSON.stringify({heartbeat}));
        const timeout = setInterval(()=>{
            if (performance.now()-heartbeat >10000){
                clearInterval(timeout);
                //StreamConnection.close();
                console.log("time Out");
                StreamConnection.close();
                closeHand();
            }else{
                try{
                    dc.send(JSON.stringify({heartbeat}));
                }catch(e){
                    clearInterval(timeout);
                    StreamConnection.close();
                    closeHand();
                    console.log(e);
                }
                
            }
        },3000);
        StreamConnection.onicecandidate = event=>{
            if (event.candidate) { 
                dc.send(JSON.stringify( event.candidate.toJSON() ));
            }
        };
        StreamConnection.onnegotiationneeded = (e)=>{
            StreamConnection.createOffer().then(sdp=>{
                StreamConnection.setLocalDescription(sdp).then(()=>{
                    dc.send(JSON.stringify(StreamConnection.localDescription.toJSON()));
                });                 
            });        
        }
        dc.addEventListener("message",e=>{
            const obj = JSON.parse(e.data);
            if (obj.heartbeat){
                console.log(obj)
                heartbeat = performance.now();
                return;
            }
        })
    }
    dc.onmessage = e=>{
        console.log(e.data);
        const obj = JSON.parse(e.data);
        if (obj.heartbeat){
            heartbeat = performance.now();
            return;
        }
        if (obj.candidate){
            StreamConnection.addIceCandidate(new RTCIceCandidate(obj.candidate)).then(()=>{
                console.log(JSON.stringify(obj.candidate));
            });
            return;
        }
        if (obj.sdp){
            StreamConnection.setRemoteDescription(new RTCSessionDescription(obj));
            if (obj.type==="offer"){
                StreamConnection.createAnswer().then(sdp=>{
                    StreamConnection.setLocalDescription(sdp);
                    dc.send(JSON.stringify(sdp));
                })
            }
        }
    };
    StreamConnection.ondatachannel = (e)=>{
        e.channel.onmessage = dc.onmessage
        e.channel.addEventListener("message",ev=>{
            const obj = JSON.parse(ev.data);
            if (obj.heartbeat){
                e.channel.send(ev.data)
                //heartbeat = performance.now();
                return;
            }
        })
        dc = e.channel
    }
    StreamConnection.onnegotiationneeded = (e)=>{
        StreamConnection.createOffer().then(sdp=>{
            StreamConnection.setLocalDescription(sdp).then(()=>{
                dataChannel.send(JSON.stringify({id:dataChannel.label,msg:{sdp}}))
            });             
        });        
    }
    getTrackShowVideo(StreamConnection) /*
    StreamConnection.onicecandidate = (e)=>{
        //console.log(e.candidate,dataChannel.label)
        if (e.candidate){
            dataChannel.send(
                JSON.stringify({id:dataChannel.label, msg:{    candidate: e.candidate.toJSON() }}));
        }
    }
*/
    return StreamConnection
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
 /*
const createOffer =async ( StreamConnection: RTCPeerConnection)  =>{
    //const StreamConnection = createMyWebRtc(dataChannel,closeHand)

    const sdp  = await StreamConnection.createOffer() 
        //console.log(sdp)
    await    StreamConnection.setLocalDescription(sdp)
    return sdp
 
}
 */
const createVideo = (finalStream?: MediaStream)=>{
    const v = document.getElementById("video")
    v.innerHTML=""
    const video_self = document.createElement("video")
    v.append(video_self)
    if (finalStream) video_self.srcObject = finalStream
    video_self.muted = true;
    video_self.controls=true;
    video_self.autoplay = true;
    video_self['playsinline'] = true;
    video_self["webkit-playsinline"]=true;
    video_self['disableremoteplayback']=true
    video_self['disablepictureinpicture']=true
    video_self.height = 300;
    video_self.width = 200;
    video_self.poster="./logo.png"
    return video_self
    //video_self.srcObject = localStream
}
 
const initDC = (conf:{receiveChannel: RTCDataChannel,StreamConnection:RTCPeerConnection} )=>{
    //let StreamConnection:RTCPeerConnection = undefined
    
    conf.receiveChannel.addEventListener("message",(e)=>{
        const db = JSON.parse(e.data)
        //console.log("initDC",db)
        if (!db.id || !db.msg){
            return
        }
        if (!dialogConfig.dialogEl.open){
            dialogConfig.dialogEl.showModal() 
        } 
        if (!conf.StreamConnection || conf.StreamConnection.signalingState==="closed"){
            conf.StreamConnection = createMyWebRtc(conf.receiveChannel)
        }
        if (db.msg.sdp){
            
            conf.StreamConnection.setRemoteDescription(new RTCSessionDescription(db.msg.sdp))
            if (db.msg.sdp.type==="offer"){
                
                conf.StreamConnection.onicecandidate = (e)=>{
                    console.log(e.candidate,db.id)
                    if (e.candidate){
                        conf.receiveChannel.send(
                            JSON.stringify({id:db.id, msg:{    
                                candidate: e.candidate.toJSON() }}));
                    }
                }
                //conf.StreamConnection.restartIce()
                conf.StreamConnection.createAnswer({ iceRestart: true }).then(
                    sdp=>{ 
                    conf.StreamConnection.setLocalDescription(sdp)
                    conf.receiveChannel.send(JSON.stringify({id:db.id,msg:{sdp}}))
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
    
    initDataChannel(receiveChannel)  
    const sc = createMyWebRtc( receiveChannel,reloadHandle)
    const conf:{
        receiveChannel: RTCDataChannel,
        StreamConnection:RTCPeerConnection,
    } = {StreamConnection:sc,receiveChannel}
    initDC(conf)
 
    const link = document.createElement("a") 
    link.textContent=receiveChannel.label
    function reloadHandle  (){
        link.textContent="重新连接"
        link.href="#"
        link.target=""
        link.onclick=()=>{
            link.textContent = receiveChannel.label
            //receiveChannel.send(JSON.stringify({id:receiveChannel.label}));
            conf.StreamConnection = createMyWebRtc(receiveChannel,reloadHandle)
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
                //console.log(videoSender,track,track.kind)
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
               // conf.StreamConnection.addTrack(track, localStream);    
            }); 
            /*
            createOffer(conf.StreamConnection).then(sdp=>{ 
                
                conf.receiveChannel.send(JSON.stringify({id:conf.receiveChannel.label,msg:{sdp}}))
            }) */
            const AudioCamera = document.createElement("button")
            AudioCamera.textContent=`静音`
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
                Camera.textContent=`切换镜头 `
              
            //} 
            //document.createElement("video")
            //const v = document.getElementById("video")
            const videoR=createVideo()
            
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
        connButton.textContent="获取offer"
        document.getElementById("init").append(connUrl,connButton) 
    }) 
}
onMount(() => {   
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
<ShowControl  ></ShowControl>
<ConnWebrtc>
    <p id="init">   </p>
    <p id="camera"> </p>
    <p id="video" > </p>
</ConnWebrtc>
