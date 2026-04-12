<script lang="ts">
import Control,{handleStartNumber,submitControlMsg}  from "$lib/Control.svelte"   
import ControlExt,{isStatusOnline} from "$lib/ControlExt.svelte" 
import MusicPlayer,{togglePlay} from '$lib/MusicPlayer.svelte';
import { onMount } from 'svelte';
import { getRecording, musicRecording, clearRecording} from "$lib/RecordingActions"
//import type {RecordingType} from "$lib/RecordingActions"
let tab_header:HTMLElement
let carname:HTMLInputElement
let socket:WebSocket = null;

let inputKey:number

//const testn = [0,0]
//let isConnWebSocket = false
let config:{api:string,ws:string,find:string}
let NowCallback:{ e:HTMLAreaElement, callback:(e?:HTMLAreaElement)=>void }= null
type handleDB ={ url:string,name:string,uri:string,timeOut:number,isNat:boolean }
//musicRecording.callback = handleStartNumber
//let RecordingBool = true;
//let Playing = false
const saveMusicRecording = ()=>{
    if (!musicRecording.RecordingValue || musicRecording.RecordingValue.length===0)
        return
    const text = JSON.stringify(musicRecording.RecordingValue,null, 2)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // 设置链接属性
    link.href = url;
    link.download =   'MusicRecording.txt';
    
    // 触发下载
    //document.body.appendChild(link);
    link.click();
    
    // 清理
    //document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
const playStatus = (playing:boolean )=>{
    musicRecording.playing = playing
    if (playing){
        clearRecording()
        musicRecording.selfDances(submitControlMsg,0 ) 
    }else{
        musicRecording.assign(getRecording())
    }
}

const dbChange = (cache:any,update:number)=>{
    if ("Carname" in cache){         
        return [{
            url:`/api?name=${cache.Carname}&msg=`,
            name:cache.Carname,
            uri:`http://${cache.LocalIP}`,
            timeOut:update,
            isNat:true}]
    }else{
        const dbs:handleDB[] = []
        Object.values(cache).forEach((v:any )=>{  
            const _v = v.DB  
            dbs.push({
                url:`/api?name=${_v.Carname}&msg=`,
                name:_v.Carname,
                uri:`http://${_v.LocalIP}`,
                timeOut:update,
                isNat:true})
        })
        return dbs
    }
}
const handleChangeDB = (dbs:handleDB[],e: HTMLAreaElement)=>{
    dbs.forEach(v=>{
        window.localStorage.setItem(v.name, JSON.stringify(v))
        let btn = document.getElementById(v.name) as HTMLAreaElement
        if (!btn){  
            btn = e.cloneNode(false) as HTMLAreaElement
            updateCarButton(v.name,btn  )           
            //btn = e.cloneNode(false) 
            tab_header.appendChild(btn)    
            
        }
        //const timeOut = Date.now() -  v.timeOut
        btn.dataset.timeOut =String( Date.now() -  v.timeOut)
        if (isStatusOnline){isStatusOnline( v.timeOut)} 
    })
}
const sendWebSocket = (msgString:string,func?:()=>void)=>{
    if (socket && socket.readyState === socket.OPEN ){
        //console.log(socket.CONNECTING)
        socket.send(msgString)
        if (func)func()
        //NowCallback = {e,callback}
        return true
    }else{
        if (!socket ||socket.readyState === socket.CLOSED){
            initWebSocket() 
        }
       
        return false
        //console.log(socket.readyState,socket.OPEN,socket.CONNECTING)
    }
}
const buttonClickHandle = (e:HTMLAreaElement,callback?:(e?:HTMLAreaElement)=>void)=>{
    //console.log(e.href)
    //console.log(window.location.hash)
    //let uri = "/api"
  
    //const groupCar = document.getElementById("groupCar")
    const msgString = JSON.stringify({ // 3. 将数据转换为字符串并设置为请求体
            name:e.href.split("#").pop() ,
            msg: e.dataset.msg
        })

    if ( sendWebSocket(msgString,()=>{
        NowCallback = {e,callback}
    })){
        return
    }
    /*
    //if (socket)console.log("->",socket.readyState)
    if (socket && socket.readyState === socket.OPEN ){
        //console.log(socket.CONNECTING)
        socket.send(msgString)
        NowCallback = {e,callback}
        return
    }else{
        initWebSocket() 
        //console.log(socket.readyState,socket.OPEN,socket.CONNECTING)
    }
*/
    fetch(config.api,{
        method: 'POST', // 1. 指定请求方法为 POST
        headers: { // 2. 设置请求头，通常需要指定内容类型
            'Content-Type': 'application/json'
        },
        body: msgString
    }).then(res=>{
        //console.log(res.ok)
        //if (isStatusOnline){isStatusOnline(res.ok?0:6000)}
        if (!res.ok){
            if (isStatusOnline){isStatusOnline(0)}
            if(callback)callback()
        }else
        res.json().then(data=>{
            console.log(data)
            if (!data.db){
                return
            }
            if(callback )callback(e) 
            data.dbs = dbChange( data.db.DB,data.db.Update)
            
            handleChangeDB( data.dbs,e)
        /*
            data.dbs.forEach(v=>{
                window.localStorage.setItem(v.name, JSON.stringify(v))
                
                let btn = document.getElementById(v.name) as HTMLAreaElement
                if (!btn){  
                    btn = e.cloneNode(false) as HTMLAreaElement
                    updateCarButton(v.name,btn  )           
                    //btn = e.cloneNode(false) 
                    tab_header.appendChild(btn)    
                    
                }
                //const timeOut = Date.now() -  v.timeOut
                btn.dataset.timeOut =String( Date.now() -  v.timeOut)
                if (isStatusOnline){isStatusOnline( v.timeOut)} 
            })*/
           
        }).catch(e=>{
            console.log(e)
        })
        
    }).catch(e=>{
        if (isStatusOnline){isStatusOnline(0)}
        console.log(e)
        if(callback)callback()
    })
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
        console.error(e)
    }
    //console.log(btn.parentElement)
    if (isView)return
    btn.classList.add("active")
    //document.getElementById("tab2").classList.add("active")
    //document.getElementById("home").classList.remove("active")
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
const initCarName = (name:string,firstBtn:Node)=>{
    //console.log(name)
    let btn = document.getElementById(name) as HTMLAreaElement
    if (!btn){             
        btn = firstBtn.cloneNode(false) as HTMLAreaElement
        updateCarButton(name,btn) 
    }  
    //console.log(btn)
    btn.click()  
}
const initButtonList = (btn:Node)=>{ 
    updateCarButton("local",btn as HTMLAreaElement) 
    let storageLen = window.localStorage.length
    while (storageLen){
        storageLen--
        const k = window.localStorage.key(storageLen)
        //console.log(k,storageLen)
        //cacheMap.set(k,window.localStorage.getItem(k))
        try{
            const v =JSON.parse(window.localStorage.getItem(k))  
            if (!v.url || !v.uri ){
                window.localStorage.removeItem(k)
                continue
            }   
            tab_header.appendChild(updateCarButton(k,btn.cloneNode(false) as HTMLAreaElement))
        }catch(e){
            window.localStorage.removeItem(k)
        }
    }
} 
const initWebSocket = ()=>{
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const port  = config.ws?config.ws:`:${window.location.port}`
    socket = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws')+'://'+window.location.hostname+port);
    socket.addEventListener('open', (event) => {
        console.log('WebSocket 连接已建立');
        //isConnWebSocket = true
    });
    
    // 接收消息
    socket.addEventListener('message', (event) => {
        //console.log('收到消息:', event.data); 
        if (NowCallback ){
            
            if(NowCallback.callback )NowCallback.callback(NowCallback.e) 
            if (event.data){
                const data = JSON.parse(event.data)
                //console.log(data)
                if (!data.db )return
                data.dbs = dbChange( data.db.DB,data.db.Update)
                handleChangeDB( data.dbs,NowCallback.e)
            }
            NowCallback=null
        }
        

    });
    
    // 连接关闭时
    socket.addEventListener('close', (event) => {
        console.log('WebSocket 连接已关闭', event);
        //window.location.reload();
        //isConnWebSocket=false
        socket = null
    });
}

const carInputRun = (firstBtn: Node)=>{
    if (carname.value.startsWith("#")){
        //console.log(carname.value.slice(1))
        //togglePlay()
        //Playing = true
        //const clist = carname.value.slice(1).split("|") 
        musicRecording.RecordingValue = carname.value.slice(1).split("|").map(clist=>{
            const [time,msg] = clist.split(":")
            return {time:Number(time),msg:Number(msg)}
        })
        musicRecording.playing=true
        //musicRecording.currentTime = 0
        musicRecording.selfDances(handleStartNumber,0)
        /*
        selfDances(
            Number(clist[0]),
            Array.from(clist[1]).map(l=>Number(l))
        ) */
    }else if (carname.value.length==6){   
        initCarName(carname.value,firstBtn)                    
        carname.value="" 
    } 
}
onMount(()=>{
    fetch("/ClientConfig.json").then(data=>{
        data.json().then(db=>{
            config = db
            //initWebSocket() 
            
            const firstBtn = tab_header.firstChild 
            carname.addEventListener("change",(e)=>{
                carInputRun(firstBtn)
            })  
            carname.addEventListener('input', function(event) {
                event.stopPropagation();
            });
            carname.addEventListener('keydown', function(event) {
                event.stopPropagation();
                if (event.code === "Enter"){
                    carInputRun(firstBtn)
                }
            });
            carname.addEventListener('keyup', function(event) {
                event.stopPropagation();
            });
            initButtonList(firstBtn) 
            if (window.location.hash){ 
                initCarName((window.location.hash).substring(1),firstBtn)               
            }else{
                (firstBtn as HTMLAreaElement).click()
            }
            fetch(config.find,{
                method:"POST",
                headers: { // 2. 设置请求头，通常需要指定内容类型
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            }).then(res=>{
                console.log(res)
            })
        })
    })
    //window.addEventListener("")
    return () => {
        socket.close();
        socket=null
        //isConnWebSocket=false
    };
})

</script>

 
<div class="tab-container">
    <div class="tab-header" id="groupCar" bind:this={tab_header} >
        <a href="#local" id="local" class="tab-button active"  >+</a>

    </div>
    
    <div class="tab-content" id="tab_content">
        <div   class="tab-pane active">
            <div class="form-group"> 
                <input bind:this={carname} onchange={(e)=>{
                   const value =  (e.target as HTMLInputElement).value
                   console.log(value)
                    
                }} type="text" id="code"    placeholder="Input Code">
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
<div>

<MusicPlayer {playStatus}  />
<button onclick={saveMusicRecording}>saveMusicRecording</button>
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

.tab-pane {
    /* display: none; */
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
