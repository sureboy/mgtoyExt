<script lang="ts" >
    import { onMount } from 'svelte';
   
 let  online:HTMLElement// = document.getElementById("online")
    let offline:HTMLElement// = document.getElementById("offline")

onMount(()=>{
    online.style.display = "none"
    offline.style.display = "none"
})
</script>
<script lang="ts" module >
export const isStatusOnline = (updatetime:number)=>{
    const timeOut = Date.now() - updatetime
    const online = document.getElementById("online")
    const offline = document.getElementById("offline")
    

    if ((6000-timeOut)<=0){
        online.style.display = "none"
        offline.style.display = "block"
    }else{
         
        document.getElementById("sign").innerHTML =(100-timeOut /6000 *100).toFixed(0) +"%"
        online.dataset.timeOut =String( timeOut)
        online.style.display = "block"
        offline.style.display = "none"
    }
}
</script>
<div class="wifi-connect-container" id="scanDiv"  > 
    
  <div bind:this={online}  id="online">
<span> 
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" fill="white" stroke="#4CAF50" stroke-width="2"/>
    <circle cx="8" cy="8" r="4" fill="#4CAF50"/>
</svg>
<span  id="sign">online</span>
</span> 

<div class="groupButton"  >
    <!--
  <div class="mic-switch-container">
    <button class="mic-switch" id="micSwitch" aria-label="麦克风开关" aria-pressed="false"  >
        <div class="mic-switch-track">
            <div class="mic-switch-thumb">
                <svg class="mic-icon" viewBox="0 0 24 24">
                    <path class="mic-on" d="M12 15C13.6569 15 15 13.6569 15 12V6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6V12C9 13.6569 10.3431 15 12 15Z"/>
                    <path class="mic-on" d="M18 12V13C18 15.7614 15.7614 18 13 18H11C8.23858 18 6 15.7614 6 13V12"/>
                    <path class="mic-off" d="M3 3L21 21" stroke-width="2"/>
                </svg>
            </div>
        </div>
        <span class="mic-status">麦克风关闭</span>
    </button>
 
    <div class="mic-ripple">1</div>
    <div class="mic-ripple">12</div>
    <div class="mic-ripple">2</div>
</div> 

    <button style=""  >      
      <svg width="48" height="48"    xmlns="http://www.w3.org/2000/svg">      
        <g >
          <circle cx="12" cy="12" r="10" fill="#F5F5F5" stroke="#FF5722" stroke-width="2"/>
          <rect x="6" y="8" width="12" height="8" rx="1" fill="#FF5722"/>
          <path d="M22 12L18 8V16L22 12Z" fill="#FF5722"/>
        </g>       
      </svg>
    </button> 
  -->
</div>
</div>

<!-- 离线状态 -->
 <div bind:this={offline} id="offline">
 <span   > 
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" fill="white" stroke="#9E9E9E" stroke-width="2"/>
    <circle cx="8" cy="8" r="4" fill="#9E9E9E"/>
</svg>
offline
</span>
  <div class="groupButton"  >
        <button   >delete</button> 
  </div>
  </div>
</div>
<style>     
/*
.mic-switch-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.mic-switch {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 12px;
    outline: none;
    transition: all 0.3s ease;
}

.mic-switch-track {
    width: 64px;
    height: 32px;
    background-color: #e0e0e0;
    border-radius: 16px;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

.mic-switch-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background-color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.mic-icon {
    width: 16px;
    height: 16px;
}

.mic-icon path {
    fill: none;
    stroke: #616161;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: all 0.3s ease;
}

.mic-icon .mic-off {
    opacity: 0;
    stroke: #f44336;
}

.mic-status {
    margin-top: 8px;
    font-size: 14px;
    color: #616161;
    font-weight: 500;
    transition: all 0.3s ease;
}


 
.mic-switch[aria-pressed="false"] .mic-on {
    stroke: #616161;
}

.mic-switch[aria-pressed="false"] .mic-off {
    opacity: 1;
}

 
.mic-ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(76, 175, 80, 0.3);
    opacity: 0;
    pointer-events: none;
}

*/
@keyframes ripple {
    0% {
        width: 48px;
        height: 48px;
        opacity: 0.3;
    }
    100% {
        width: 96px;
        height: 96px;
        opacity: 0;
    }
}

 /*
.mic-switch:hover .mic-switch-track {
    background-color: #bdbdbd;
}



.mic-switch:focus-visible {
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
    border-radius: 24px;
}
    */
  .groupButton {
    display: flex;
    flex-wrap: wrap;
    margin: 20px 0;
    justify-content: center;
  }
  .groupButton button{
    text-decoration: none;
    font-size: 24px;
    border: none;
    border-radius: 10px;
    background-color: #ddd;
    cursor: pointer;
    transition: all 0.2s;
    font-size:xx-large;
    color: white;
    padding: 10px 20px;
    margin: 5px;
  }

  .groupButton button:hover {
    background-color: #ccc;
  }

  .groupButton button:active {
    transform: scale(0.95);
  }
    
</style>