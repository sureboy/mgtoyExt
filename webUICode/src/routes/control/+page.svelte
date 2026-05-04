<script lang="ts">  
import {getFace} from "$lib/canvasFace"
import { onMount } from 'svelte';
import InfoPanel from "$lib/components/InfoPanel.svelte";
import Joystick from "$lib/components/Joystick.svelte";
//let canvas:HTMLCanvasElement
let directionSpan:number;
let video:HTMLVideoElement;
// ----- 摄像头初始化 (视频背景) -----
function initCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("浏览器不支持摄像头");
        showCameraFallback();
        return;
    }
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play().catch(e => console.warn("自动播放失败", e));
        })
        .catch(err => {
            console.error("摄像头错误: ", err);
            showCameraFallback();
        });
} 
// 降级处理: 如果摄像头不可用，显示纯色背景并带文字提示 (依然能测试摇杆)
function showCameraFallback() {
    getFace(video) 
}
 
onMount(()=>{ 
   initCamera()
})
</script>
<svelte:head><title  >{directionSpan}</title></svelte:head> 

<video id="bgVideo" bind:this={video} autoplay muted playsinline></video> 
 
<Joystick bind:directionSpan={directionSpan}></Joystick>
<InfoPanel></InfoPanel>
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
#bgVideo {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;   /* 覆盖全屏，保持比例裁剪 */
    z-index: 1;
    background: #0a0f14;
}

 
</style>