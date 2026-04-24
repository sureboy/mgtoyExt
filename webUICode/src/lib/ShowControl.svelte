<script lang="ts">
import { onMount } from 'svelte';
//const {handInputText}:{handInputText?:(v:string)=>boolean} = $props()
//export let handInputText: (v:string)=>void

const carInputRun = (firstBtn: Node)=>{
    if (handInputText && 
        handInputText(carname.value)){
        return
    }  
    if (carname.value.startsWith("#")){
        console.log(carname.value.slice(1)) 
    }else if (carname.value.length==6){   
        initCarName(carname.value,firstBtn)                    
        carname.value="" 
    }    
}  
onMount(()=>{
 
    
    const firstBtn = tab_header.firstChild 
    carname.addEventListener("change",(e)=>{
        carInputRun(firstBtn)
    })  
    carname.addEventListener('input', function(event) {
        event.stopPropagation();
    });
    carname.addEventListener('keydown', function(event) {
        event.stopPropagation();
        //console.log(event)
        if (event.code === "Enter"){
            carInputRun(firstBtn)
        }
    });
    carname.addEventListener('keyup', function(event) {
        event.stopPropagation();
    });
})
</script>
<script lang="ts" module>
import Control  from "$lib/Control.svelte"   
import ControlExt,{isStatusOnline} from "$lib/ControlExt.svelte"  

let tab_header:HTMLElement
let carname:HTMLInputElement 
let inputKey:number
let datalist:HTMLDataListElement
let dataChannel:RTCDataChannel|undefined = undefined
type handleDB ={ url:string,name:string,uri:string,timeOut:number,isNat:boolean }

const handInputText =(id:string)=>{
    if (id.length!=5 || !dataChannel){
        return false
    }
    
    dataChannel.send(JSON.stringify({id}))
    return true
}
let NowCallback:{ e:HTMLAreaElement, callback:(e?:HTMLAreaElement)=>void }= null
const buttonClickHandle = (e:HTMLAreaElement,callback?:(e?:HTMLAreaElement)=>void)=>{ 
    const msgString = JSON.stringify({  
            name:e.href.split("#").pop() ,
            msg: e.dataset.msg
        })
    console.log(msgString)
    dataChannel?.send(msgString)
    NowCallback = {e,callback}
    
}

const showTabPage = (btn:HTMLElement)=>{
    if (!btn)return
    let isView = false
    try{
        btn.parentElement.querySelectorAll('.active').forEach(v=>{
            if (!isView){
                isView =  (btn ==v) 
            }
            
            if (!isView) v.classList.remove("active")
        });
    }catch(e){
        console.log(e)
    }
    //console.log(btn.parentElement)
    if (isView)return
    btn.classList.add("active") 
}
const updateCarButton = (name:string,btn:HTMLAreaElement)=>{ 
    btn.innerHTML = name 
    btn.id = name 
    btn.href="#"+name 
    btn.classList.remove('active')  
    const btnClick = ()=>{
        if (!btn.href.endsWith(btn.id)){
            btn.href="#"+btn.id 
        }
        buttonClickHandle(btn,(_btn)=>{
            showTabPage(_btn?_btn:btn) 
            if(!btn.dataset.msg || btn.dataset.msg==='0' )return 
            let sec = 200
            if (btn){
                if (btn.dataset.timeOut)
                sec=Math.max((2000-Number(btn.dataset.timeOut))/2,200) 
            }  
            setTimeout(()=>{                     
                btnClick()                 
            },sec)     
        })
    }
    btn.onclick =  btnClick 
    return btn
}
//export const handInputText = (func:(v:string)=>void)=>{

//}

const checkCarName = (name:string,firstBtn:Node)=>{ 
    let btn = document.getElementById(name) as HTMLAreaElement
    if (!btn){             
        btn = firstBtn.cloneNode(false) as HTMLAreaElement
        updateCarButton(name,btn) 
        tab_header.appendChild(btn) 
    }   
    return btn
}
const initCarName = (name:string,firstBtn:Node)=>{ 
    checkCarName(name,firstBtn).click()  
    //btn.click()  
} 
const dbChange = (cache:any,update:number)=>{
    if ("Carname" in cache){         
        return [{
            url:`/api?name=${cache.Carname}&msg=`,
            name:cache.Carname,
            uri:`http://${cache.RemoteIP}`,
            timeOut:update,
            isNat:true}]
            /*
    }else{
        const dbs:handleDB[] = []
        Object.values(cache).forEach((v:any )=>{  
            const _v = v.DB  
            dbs.push({
                url:`/api?name=${_v.Carname}&msg=`,
                name:_v.Carname,
                uri:`http://${_v.RemoteIP}`,
                timeOut:update,
                isNat:true})
        })
        return dbs*/
    }
    return undefined
}
const handleChangeDB = (dbs:handleDB[],e: HTMLAreaElement)=>{
    dbs.forEach(v=>{ 
        const  btn = checkCarName(v.name,e) 
        btn.dataset.timeOut =String( Date.now() -  v.timeOut)
        if (isStatusOnline){isStatusOnline( v.timeOut)} 
    })
}

export const initDataChannel = (dc:RTCDataChannel) =>{
    initLocalBut()
    dataChannel = dc;
    dataChannel.onmessage = (event)=>{
        if (!event.data)return;
        handleMsg(event.data)
    }
    //dataChannel.send(JSON.stringify({video:true}))
    //return dataChannel.onmessage
}
const handleMsg = (data:any)=>{
    try{
        const db = JSON.parse(data)
        if (db.videoList){
             
            datalist.innerHTML = ''; 
            (db.videoList as string[]).forEach(v=>{
                const opt = document.createElement("option")
                opt.value = v
                opt.text = v
                datalist.append(opt)
            })
            return
        }
        
        const db_ = dbChange( db.DB,db.Update)
        //console.log(db,db_,NowCallback) 
        if (db_){
            if (NowCallback ){            
                if(NowCallback.callback )NowCallback.callback(NowCallback.e) 
                handleChangeDB( 
                            db_,
                            NowCallback.e)
                NowCallback=null
            } else{
                db_.forEach(v=>{
                    checkCarName(v.name,tab_header.firstChild as HTMLAreaElement)
                })
            }     
        }
        
    }catch(e){
        console.log(e)
        return;
    }             
}
const initLocalBut = ()=>{
    updateCarButton("local",tab_header.firstChild as HTMLAreaElement).click()
}
</script>
<div class="tab-container">
    <div class="tab-header" id="groupCar" bind:this={tab_header} >
        <a href="#local" id="local" class="tab-button active"  >+</a>

    </div>
    
    <div class="tab-content" id="tab_content">
        <div   class="tab-pane active">
            <div class="form-group"> 
                <input bind:this={carname} onfocus={()=>{
                    dataChannel.send(JSON.stringify({video:true}))
                }} onchange={(e)=>{
                   const value =  (e.target as HTMLInputElement).value
                   console.log(value)
                    
                }}   type="text" id="code" list="videoList"   placeholder="Input Code">
            <datalist bind:this={datalist} id="videoList">

            </datalist>    
        </div>
        </div>        
        <div   class="tab-pane"  >
            <div class="remote-control">    
                <div class="control-panel" >
                    <div class="speed-control">
                        <ControlExt />
                    </div>
                    <Control {inputKey} />
                </div>
                
            </div>
        </div>     
    </div>

</div>
<style>
    /* 基础样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Arial', sans-serif;
}

.remote-control {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;

    } 
    .control-panel {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
    
    }
    
    
    .speed-control {
    flex: 1;
    min-width: 250px;
    padding: 20px;

    }
/* 标签容器 */
.tab-container {
    max-width: 1000px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

/* 标签头部 */
.tab-header {
    display: flex;
    background: #f1f1f1;
    border-bottom: 1px solid #ddd;
    overflow-x: auto; /* 小屏幕时可横向滚动 */
    scrollbar-width: none; /* 隐藏滚动条 */
}

.tab-header::-webkit-scrollbar {
    display: none; /* Chrome/Safari隐藏滚动条 */
}

.tab-button {
    padding: 12px 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    color: #555;
    white-space: nowrap; /* 防止文字换行 */
    transition: all 0.3s ease;
    position: relative;
    text-decoration: none;
}

.tab-button:hover {
    background: #e0e0e0;
}

.tab-button.active {
    color: #2196F3;
    background: white;
}

.tab-button.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: #2196F3;
}

/* 标签内容 */
.tab-content {
    padding: 20px;
}


.tab-pane.active {
    display: block;
    animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}


.form-group {
    margin-bottom: 15px;
}


.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .tab-button {
        padding: 10px 15px;
        font-size: 14px;
    }
    
    
}

@media (max-width: 480px) {
    .tab-header {
        flex-wrap: wrap;
    }
    
    .tab-button {
        flex: 1 0 50%;
        text-align: center;
    }
    
}
</style>