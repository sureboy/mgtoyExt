<script lang="ts">  
import BlinkEyes from '$lib/components/BlinkEyes.svelte';
import InfoPanel from "$lib/components/InfoPanel.svelte";
import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte"
import {connWebRTC } from '$lib/webrtc' 
//    import { clearInterval } from 'node:timers';
//let canvas:HTMLCanvasElement
const createCmdSender = (sendMsg:(n:number)=>void) => {
    let currentTimer: NodeJS.Timeout | null = null;
    let currentN: number | undefined; 
    return (n: number) => {
        if (currentN === n) return;
        if (currentTimer) clearTimeout(currentTimer);
        sendMsg(n)
        //console.log(wheelNumber[changeNumber[n]]);
        currentN = n;

        const tick = () => {
            if (currentN === 0) return;      // 若n=0则停止循环
            //console.log(wheelNumber[changeNumber[currentN!]]);
            sendMsg(currentN)
            currentTimer = setTimeout(tick, 1000);
        };

        if (n !== 0) {
            currentTimer = setTimeout(tick, 1000);
        }
    };
};
const wheel = {
    up:1|(1<<2),
    down:2|(2<<2),
    left:2|(1<<2),
    right:1|(2<<2),
    stop:0,
}
const wheelNumber = [
    ()=>0,
    ()=>wheel.down & wheel.left,
    ()=>wheel.down,
    ()=>wheel.down & wheel.right,
    ()=>wheel.left,
    ()=>0,
    ()=>wheel.right,
    ()=>wheel.up & wheel.left,
    ()=>wheel.up,
    ()=>wheel.up & wheel.right,
]
const changeNumber=[ 0,6,3,2,1,4,7,8,9 ]
const initDataChannel = (dataChannel: RTCDataChannel)=>{
    dataChannel.addEventListener("message",(e)=>{
        console.log(e)
    })
}

onMount(()=>{ 
    connWebRTC().then((res) =>{  
        initDataChannel(res.dataChannel)
        console.log(res)
            const msgString = JSON.stringify({  
            name:"local" ,
            msg: 0
        })
        console.log(msgString)
        res.dataChannel.send(msgString)
    }).catch(e=>{
        console.log(e)
    })
})
</script>
<svelte:head><title  >mgtoy</title></svelte:head> 
<div class="bg"><BlinkEyes></BlinkEyes></div>
<Joystick clickEvent={createCmdSender((n)=>{
    console.log(wheelNumber[changeNumber[n]]);
})}></Joystick>
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
.bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;   /* 覆盖全屏，保持比例裁剪 */
    z-index: 1;
    background: #000;
}

 
</style>