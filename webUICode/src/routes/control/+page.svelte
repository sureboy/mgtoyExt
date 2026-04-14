<script lang="ts">
import ShowControl,{initDataChannel} from "$lib/ShowControl.svelte";
import { onMount } from 'svelte'; 
import {connWebRTC} from '$lib/webrtc'
let remoteVideo:HTMLVideoElement
onMount(()=>{
    connWebRTC(event=>{
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            // 可选：监听视频加载完毕自动播放
            remoteVideo.onloadedmetadata = () => {
            remoteVideo.play().catch(
                e => console.warn('自动播放失败:', e));
            };
        }
    }).then(initDataChannel)
})
</script>

<ShowControl></ShowControl>