<script lang="ts"  >
import { onMount } from "svelte";
import type {infoStruct} from "$lib/utils/mainDataStruct"
//    import { info } from "node:console";
//    import { info } from "node:console";
//import type {infoStruct} from "../utils/mainDataStruct.ts"
const {infoData}:{infoData:infoStruct} = $props()

//let codeInput:HTMLInputElement
//let sendBtn:HTMLButtonElement
//let showInfo=$state(true)
//let datalist:HTMLDataListElement
let info_panel:HTMLDivElement
const defaultUrl = "http://192.168.1.8:3000/conn.html"
//let inputStyle:any
onMount(()=>{
    infoData.codeInput.addEventListener('blur',e=>{
        console.log(e)
        //inputStyle = infoData.codeInput.style
        infoData.codeInput.style=""
        info_panel.style.right=""
        //info=false
    })
    infoData.codeInput.addEventListener('focus',e=>{
        console.log(e)
        //showInfo=true
        info_panel.style.right="10px"

    })
    infoData.codeInput.addEventListener('click',e=>{
        //console.log(e)
        // alert("test")
    })
    infoData.sendBtn.addEventListener("click",(e)=>{
        if (infoData.codeInput.value.startsWith("http")){
            const src = encodeURIComponent(window.location.origin+window.location.pathname)
            const connButton = document.createElement("a")
            connButton.href = infoData.codeInput.value + "#" + src
            connButton.textContent="连接"
            infoData.info.append(connButton) 
            connButton.click()
        }
    })
})

</script>

<div class="info-panel" bind:this={info_panel}>
    <div class="command-area">
        <textarea bind:this={infoData.codeInput} 
          id="cmdInput" 
          
        class="command-input" 
        placeholder="指令 (1-8 / 0)" autocomplete="off"></textarea>
        <button  bind:this={infoData.sendBtn}   class="send-btn">确定</button>
    </div>
     
    <div class="code-section" id="info" bind:this={infoData.info}>
    
        <a class="code-label" href="#conn" onclick={(e)=>{
            infoData.codeInput.value = defaultUrl
            //infoData.codeInput.focus()
        }} >webrtc连接</a> 
    </div>
   
</div>

<style>
/* 信息面板 - 半透明玻璃效果，并且可以点击交互 */
.info-panel {
    position: fixed;
    top: 44px;
    left: 10px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    padding: 12px 24px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 100;
    pointer-events: auto;      /* 允许面板内元素交互（输入框、按钮） */
    font-weight: 600;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    flex-wrap: wrap;
    color: white;
}

.code-section {
    display: flex;
    align-items: baseline;
    gap: 12px;
    background: rgba(0, 0, 0, 0.4);
    padding-right: 16px;
    border-radius: 40px;
}

.code-label {
    font-size: 14px;
    letter-spacing: 1px;
    color: #ccdeff;
     
}

/* 输入框和按钮样式 */
.command-area {
    display: flex;
    gap: 10px;
    align-items: center;
    background: rgba(20, 30, 40, 0.6);
    border-radius: 15px;
    padding: 5px 12px 5px 20px;
    backdrop-filter: blur(4px);
    justify-content: space-between;
}

.command-input {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 15px;
    color: white;
    font-family: monospace;
    outline: none;
    width: 130px;
    transition: all 0.2s;
    backdrop-filter: blur(4px);
    flex: 1;
    width: auto;
}

.command-input:focus {
    border-color: #6ab0ff;
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 6px #6ab0ff80;
}

.command-input::placeholder {
    color: #bbd9ffaa;
    font-size: 12px;
}

.send-btn {
    background: rgba(80, 140, 200, 0.85);
    border: none;
    border-radius: 40px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: 0.2s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.send-btn:active {
    transform: scale(0.96);
    background: #3b82f6;
}   

 
</style>