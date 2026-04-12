<script lang="ts" module>
//import {pushRecording} from "$lib/RecordingActions"
let settingNode = null
const wheel = {
    up:1|(1<<2),
    down:2|(2<<2),
    left:2|(1<<2),
    right:1|(2<<2),
    stop:0,
}
export const wheelNumber = [
    ()=>0,
    ()=>wheel.down & 3,
    ()=>wheel.down,
    ()=>wheel.down & 3<<2,
    ()=>wheel.left,
    ()=>0,
    ()=>wheel.right,
    ()=>wheel.up & 3,
    ()=>wheel.up,
    ()=>wheel.up & 3<<2,
]
    
export const handleStartNumber = (n:number)=>{ 
    //direction = "red"; 
    let tag = wheelNumber[n]
    if (!tag)return

    if (!settingNode){
        settingNode = document.getElementById("stop") 
    }
    settingNode.style.color = "red"; 
    const l = tag()
    submitControlMsg(l )
    //pushRecording(l)
    //inputKey = n
    //return l
}
export function submitControlMsg(m:number){ 
    const btn = document.getElementById(window.location.hash.substring(1))
    if (btn){
        //console.log(btn)
        btn.dataset.msg = m.toString()
        btn.click()
    }  
}
 </script>

<script lang="ts">
import { onMount } from 'svelte';
let {inputKey}:{inputKey:number} = $props()

let directional:HTMLElement

let DraggingButton = null
const wheelSetting  = {
    down:"up",
    right:"left",
    up:"down",
    left:"right",
}


/*
const run = (btn,sec)=>{
    setTimeout(()=>{
        btn.click()                    //console.log(btn.dataset.msg)
        if (btn.dataset.msg>0)run(btn,sec)
        
    },sec)
}
*/


const handleStart = (tagid)=>{ 
    //direction = "red"; 
    let tag = wheel[tagid]
    if (!tag)return
    if (!settingNode){
        settingNode = document.getElementById("stop") 
    }
    settingNode.style.color = "red"; 
    
    submitControlMsg(tag)
}
const handleStop = ()=>{
    //console.log("stop")
    submitControlMsg(0)
    if (!settingNode){
        settingNode = document.getElementById("stop") 
    }
    //direction = "white"; 
    settingNode.style.color = "white";
/*
    const button = e.target.closest('button');
    if (!button)return 
    if (button  == settingNode){
        handleSetting()
    }
        */
  
}

const handleDragging =(e)=>{
    e.preventDefault()
    if (!DraggingButton) return

    moveDraggingButton(e)
    return
    //DraggingButton.style.p
    const button = e.target.closest('button');
    if (!button){
        return
    } 
    if (button.id ===DraggingButton.id)return

    console.log(button.id,DraggingButton.id)
}
const moveDraggingButton = e=>{
    return
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    //console.log(clientX,clientY)
    DraggingButton.style.left = `${clientX}px`;
    DraggingButton.style.top = `${clientY}px`;
}
const setDraggingButton = (btn)=>{
    
    DraggingButton = btn.cloneNode(true)
    btn.parentElement.appendChild(DraggingButton) 
    DraggingButton.style.position = 'absolute';
    DraggingButton.style.zIndex = '1000';
    DraggingButton.style.cursor = 'grabbing';
}
const cleanDraggingButton = (button)=>{

    if (!DraggingButton)return
  

    if (button){
       // window.alert([button.id,DraggingButton.id])
        if ( button.id !== DraggingButton.id ){ 
            if (window.confirm(`${button.innerText} ⇌ ${DraggingButton.innerText}`)){
                const d1 = wheel[button.id] 
                wheel[button.id]  = wheel[DraggingButton.id]
                wheel[DraggingButton.id] = d1
                const Fwheel = wheelSetting[button.id]
                if (Fwheel !==DraggingButton.id){
                    wheel[Fwheel] = wheel[button.id]^15
                    wheel[wheelSetting[DraggingButton.id]] = wheel[DraggingButton.id]^15
                }
            }
            
        } 
    }
    DraggingButton.parentElement.removeChild(DraggingButton)
    DraggingButton = null
}
const handleDirection = (e) => {
    e.preventDefault()
    const button = e.target.closest('button');
    if (!button){
        return
    } 
    if (button.id in wheel){
        setDraggingButton(button)
        moveDraggingButton(e)
        handleStart(button.id)
    }else{
        submitControlMsg(0)
    }
};

onMount(()=>{
    document.addEventListener('keydown',e=>{
        if (!e.repeat && e.code ){
            if (e.code.startsWith("Numpad")) {
                //console.log(Number(e.code.substring(6)))
                inputKey = Number(e.code.substring(6))
                handleStartNumber(inputKey)
            }else  if (e.code.startsWith("Arrow")){
                const k = e.code.substring(5).toLowerCase()
                //console.log(e.code)
                //wheel
                handleStart(k)
            }
        }

    })
    document.addEventListener('keyup',e=>{
        if ( e.code.startsWith("Arrow") ){
            handleStop()
        }else if (e.code.startsWith("Numpad")){
            handleStartNumber(0)
        }
    })
    directional.addEventListener('contextmenu',  e=> e.preventDefault(), { passive: false })

    directional.addEventListener('touchmove', (e)=>{
                                    handleDragging(e)
                                    //cleanDraggingButton(e)
                                }, { passive: false })
    directional.addEventListener('mousemove',handleDragging, { passive: false })
    directional.addEventListener('mouseleave',(e)=>{
                                    handleStop()
                                    e.preventDefault()
                                // cleanDraggingButton(e)
                                }, { passive: false }) 
    directional.addEventListener('touchend',   (e)=>{
                                    handleStop()
                                    e.preventDefault()
                                    const touch = e.changedTouches[0];
                                    const actualElement = document.elementFromPoint(touch.clientX, touch.clientY);
                                    const closestElement = actualElement.closest('button');
                                    cleanDraggingButton(closestElement)
                                }, { passive: false })
    directional.addEventListener('touchstart',   handleDirection , { passive: false })
    directional.addEventListener('mousedown',   handleDirection , { passive: false })
    directional.addEventListener('mouseup', (e)=>{
        handleStop()
        e.preventDefault()
        cleanDraggingButton((e.target as HTMLElement).closest('button'))
    }, { passive: false })
    directional.addEventListener('touchcancel',(e)=>{
        handleStop()
        e.preventDefault()
    }, { passive: false })

})
</script>
 
<!-- 方向控制 -->
<div class="directional-pad" id="directional" bind:this={directional} >
    <button draggable="false"  id="up" class="direction-btn up" >
        ↑
    </button>
    <button class="direction-btn left" id="left"  >
        ←
    </button>
    <button class="  direction-btn stop" id="stop" >
        ●
    </button>
    <button class="direction-btn right" id="right" >
        →
    </button>
    <button class="direction-btn down" id="down" >
        ↓
    </button>
</div>
<style>
 
  .directional-pad {
    display: grid;
    grid-template-columns: repeat(3, 80px);
    grid-template-rows: repeat(3, 80px);
    gap: 5px;
    margin: 0 auto;
  }
  
  .direction-btn {
    font-size: 24px;
    border: none;
    border-radius: 10px;
    background-color: #ddd;
    cursor: pointer;
    transition: all 0.2s;
    font-size:xx-large;
    color: white;
  }
  
  .direction-btn:hover {
    background-color: #ccc;
  }
  
  .direction-btn:active {
    transform: scale(0.95);
  }
  
  .up {
    grid-column: 2;
    grid-row: 1;
  }
  
  .left {
    grid-column: 1;
    grid-row: 2;
  }
  
  .stop {
    grid-column: 2;
    grid-row: 2;
    
  }
  
  .right {
    grid-column: 3;
    grid-row: 2;
  }
  
  .down {
    grid-column: 2;
    grid-row: 3;
  }
 
   
     
</style>