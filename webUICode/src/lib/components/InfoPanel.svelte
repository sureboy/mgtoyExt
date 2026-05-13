<script lang="ts"  >
import { onMount } from "svelte";
import type {infoStruct} from "$lib/utils/mainDataStruct"  
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import Dialog  from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm'
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
const {infoData}:{infoData:infoStruct} = $props()

//let codeInput:HTMLInputElement
//let sendBtn:HTMLButtonElement
//let showInfo=$state(true)
//let datalist:HTMLDataListElement
let info_panel:HTMLDivElement
let jsonForm:HTMLDivElement
const connUrl = "http://192.168.1.8:3000/conn.html"
//let inputStyle:any
const getConnHostJsonStr = ()=>{
    return  {
        _comment:"跨网信令交换服务",
        id:Date.now().toString(32).slice(4),
        id_comment:"[加入]端需要输入[生成]端的id",
        create:false,
        create_comment:"[生成/加入]WebRtc会话",
        host_comment:"信令交换服务公共网址",
        host:"https://www.zaddone.com/rtc"} 

}
const submit = ()=>{
    const btn = document.createElement('button');
    btn.textContent = '提交';
    Object.assign(btn.style, {
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    });
    return btn
    /*
    btn.onclick = () => {
        const updated = collectFormData(jsonForm);
        console.log(updated);
        alert(JSON.stringify(updated, null, 2));
    };
    jsonForm.appendChild(btn);*/
}
onMount(()=>{
    //infoData.sendBtn.classList.remove("btn-focus")
    infoData.codeInput.addEventListener('blur',e=>{
        //console.log(e)
        //inputStyle = infoData.codeInput.style
        setTimeout(()=>{
            infoData.codeInput.style=""
            info_panel.style.right="" 
            
            //infoData.sendBtn.classList.remove("btn-focus")
            //infoData.codeInput.innerHTML=""
            //infoData.sendBtn.style.display="" 
        },100)

    })
    infoData.codeInput.addEventListener('focus',e=>{
        //console.log(e)
        //showInfo=true
        
        infoData.codeInput.style.height = 'auto'; // 先重置高度，以便根据内容重新计算
        infoData.codeInput.style.height = (infoData.codeInput.scrollHeight) + 'px'; // 设置高度为滚动高度 
        //const enter = infoData.sendBtn.cloneNode(true)
        //infoData.sendBtn.style.display="none"
        //infoData.codeInput.append(enter)
        //infoData.sendBtn.classList.add("btn-focus")
        info_panel.style.right="10px"

    })
     
    infoData.sendBtn.onclick = (e)=>{
        if (!infoData.codeInput.value){
            return
        }
        try{
            const db = JSON.parse(infoData.codeInput.value)
            if (db.connUrl){
                const src = encodeURIComponent(window.location.origin+window.location.pathname)
                const connButton = document.createElement("a")
                connButton.href = infoData.codeInput.value + "#" + src
                connButton.textContent="连接"
                infoData.info.append(connButton) 
                connButton.click()
                return
            }
            
            if (db.host){
                createWebrtcConnFromCenterUrl(db)
                return
            }
            
        }catch(e){
            console.error(e)
        }
    }
})
</script>

<div class="info-panel" id="info_panel" bind:this={info_panel}>


    <div class="command-area">
    <textarea   bind:this={infoData.codeInput} 
          id="cmdInput" 
        class="command-input" 
        placeholder={`点击输入`} autocomplete="off"></textarea>
    <button  bind:this={infoData.sendBtn} class="send-btn ">确定</button>
 
    </div>
     <details    >
    <summary   style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
webRTC conn
</summary>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div  style="color:white;text-align: center;" id="module_list"   
  > 
          <a class="code-label" href="#info_panel" onclick={(e)=>{ 
            jsonToForm({connUrl,_comment:"自建服务器地址"},jsonForm)
            dialogConfig.dialogEl.showModal()
            //infoData.codeInput.value = JSON.stringify({connUrl},null,2) 
            //setTimeout(()=>infoData.codeInput.focus(),100)
        }} >自建信令交换服务</a> 
        <a class="code-label" href="#info_panel" onclick={(e)=>{ 
            jsonToForm(getConnHostJsonStr() ,jsonForm) 
            const btn = submit();
            btn.onclick = () => {
                const updated = collectFormData(jsonForm);
                console.log(updated);
                alert(JSON.stringify(updated, null, 2));
            };
            jsonForm.appendChild(btn);
            dialogConfig.dialogEl.showModal()
            //infoData.codeInput.value =JSON.stringify( getConnHostJsonStr() ,null,2) 
            //setTimeout(()=>infoData.codeInput.focus(),100)
        }} >跨网信令交换服务</a> 
 
</div> 
</details>
 
   
</div>
<Dialog {dialogConfig}   > 
     <div bind:this={jsonForm} style="text-align:left" >
 
    </div>
</Dialog>
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
    transition: all 0.2s;
    backdrop-filter: blur(4px);
    flex: 1;
    width: auto;
        height:20px;
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
    height:38px;
    padding: 4px 20px;
    font-size: 14px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: 0.2s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    position: absolute;
    top: 12px;
    right: 25px;
     border-radius: 10px;
}

.send-btn:active {
    transform: scale(0.96);
    background: #3b82f6;
}   
 
</style>