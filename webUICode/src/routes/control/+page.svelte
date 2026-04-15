<script lang="ts">
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import { onMount } from 'svelte'; 
import {connWebRTC,configuration} from '$lib/webrtc' 
let remoteVideo:HTMLVideoElement
onMount(()=>{
    connWebRTC().then(({dataChannel}) =>{
        
        if (window.location.hash){
            const id = window.location.hash.slice(1)
            
            const old  = dataChannel.onmessage
            dataChannel.onmessage = (e)=>{
                const db = JSON.parse(e.data)
                console.log(db)
                if (Array.isArray(db)){ 
                    (async ()=>{
                        const StreamConnection = new RTCPeerConnection(configuration);
                        StreamConnection.oniceconnectionstatechange=(e)=>{
                            console.log(StreamConnection.connectionState)
                        }
                        db.forEach(v=>{
                            if (v.offer){
                                StreamConnection.setRemoteDescription(new RTCSessionDescription(v.offer))
                            }else if (v.candidate){
                                StreamConnection.addIceCandidate(v.candidate)
                            }
                        });
                        const answer = await StreamConnection.createAnswer({ iceRestart: true });
                        await StreamConnection.setLocalDescription(answer);
                        
                        dataChannel.send(JSON.stringify({id,msg:{answer}}))
                        StreamConnection.onicecandidate = event => {
                            if (event.candidate) { 
                                //event.candidate.toJSON()
                                dataChannel.send(JSON.stringify({id, msg:{    candidate: event.candidate }}));
                            }else{
                                console.log("ICE end")
                            }
                        };
                        StreamConnection.ontrack =event=>{
                            console.log(event)
                            remoteVideo.srcObject = event.streams[0];
                            remoteVideo.play();
                        }
                    })();
                    
                    return
                }
                old?.call(dataChannel,e)
            }
            dataChannel.send(JSON.stringify({id}))
        }else{
            initDataChannel(dataChannel)
        }
        

    })
})
</script>

<ShowControl></ShowControl>

<video bind:this={remoteVideo}></video>