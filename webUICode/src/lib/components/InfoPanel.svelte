<script lang="ts" module>
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import { SvelteMap } from 'svelte/reactivity';
import {getLocalStream} from '$lib/utils/getLocalStream'
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
export type InfoType ={dc: RTCDataChannel,pc: RTCPeerConnection,localStream?: MediaStream,[key:string]:any}
export const meshMap =new SvelteMap<string,any>()
export const meshList:InfoType[] =$state([])
</script>
<script lang="ts"  >
//import { onMount } from "svelte";
//import type {infoStruct} from "$lib/utils/mainDataStruct"  
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import Dialog  from '$lib/components/Dialog.svelte'
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm' 
 //   import { isStatusOnline } from '$lib/ControlExt.svelte';
let mgtoyTitle = $state("mgtoy")
const connUrl = "http://192.168.1.8:3000/conn.html" 
const getConnHostJsonStr = ()=>{
    return  {
        _comment:"跨网信令交换服务",
        id:Date.now().toString(32).slice(4),
        id_comment:"[加入]端需要输入[生成]端的id",
        create:false,
        create_comment:"[生成/加入]WebRtc会话",
        host_comment:"信令交换服务公共网址",
        host:"https://www.zaddone.com/rtc"
    }  
}
const ShowSubmit = (db:any,hand:(db:any)=>void)=>{ 
    jsonToForm(db ,dialogConfig.content)  
    const btn = document.createElement('button');
    btn.textContent = '确定';
    Object.assign(btn.style, {
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    btn.onclick = () => { 
        hand(collectFormData(dialogConfig.content)) 
    };
    dialogConfig.content.appendChild(btn); 
}

const isStatusOnline = (updatetime:number)=>{
    const timeOut = Date.now() - updatetime 
    console.log(timeOut)
    if ((6000-timeOut)<=0){
        return '' 
    }else{ 
        return '('+(100-timeOut /6000 *100).toFixed(0) +"%)" 
    }
}
const attachElement = (
    element: HTMLDivElement,
    obj:InfoType)=>{
    //(element.firstChild as HTMLButtonElement).click();
    obj.dc.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
            }))
    obj.dc.addEventListener("message",(e)=>{
        const db = JSON.parse(e.data)
        console.log(db)
        if (db.DB && db.DB.Carname ){
            const conf = {name:db.DB.Carname}
            let c = document.getElementById(conf.name)  as HTMLButtonElement
            if (c){
                const n = isStatusOnline(db.Update)
                if (!n){
                    c.disabled=true
                }else{
                    c.disabled=false
                }
                c.textContent = n+conf.name
                
                return
            }
            //document.createElement('button')
            c =element.firstChild.cloneNode() as  HTMLButtonElement
            c.onclick=()=>{
                mgtoyTitle=conf.name+"-"+"control"
                obj.setSender(conf)
            }
            c.id = conf.name
            element.append(c)
            c.textContent =conf.name
            //dcconfig.children.push({name:db.DB.Carname})
        }
        
    })

    obj.pc.addEventListener('track',(ev)=>{
        if (ev.type===''){

        }
    })
}
const showVideo = (element: HTMLDivElement,
    obj:InfoType)=>{
     //obj.setSender({name:"local"})
    //element.dataset.facing = "test"
    //const facing = element.dataset.facing || { exact: "environment" }
    //const senders = obj.pc.getSenders();
    getLocalStream(element.dataset.facing || { exact: "environment" }).then(({localStream})=>{ 
        obj.localStream = new MediaStream()
        const c = element.firstChild.cloneNode() as  HTMLButtonElement
        c.textContent = 'open video'
        element.append(c)
        c.onclick = ()=>{
            obj.dc.send(JSON.stringify({   
                hasVideo: true,
            })) 
            /*
            const senders = obj.pc.getSenders();
            localStream.getTracks().forEach(track => {
                const videoSender = senders.find(
                sender => sender.track 
                && sender.track.kind === track.kind);
                if (!videoSender) {
                    obj.localStream.addTrack(track)
                    obj.pc.addTrack(track, obj.localStream); 
                }else{
                    if (track.kind==="audio"){
                        return
                    }
                    obj.localStream.addTrack(track)
                    videoSender.track.stop()
                    videoSender.replaceTrack(track);
                } 
            })*/
        }
        /*
        v.localStream.getTracks().forEach(track => {
            const videoSender = senders.find(
            sender => sender.track 
            && sender.track.kind === track.kind);

            if (!videoSender) {
                obj.localStream.addTrack(track)
                obj.pc.addTrack(track, obj.localStream); 
            }else{
                if (track.kind==="audio"){
                    return
                }
                obj.localStream.addTrack(track)
                videoSender.track.stop()
                videoSender.replaceTrack(track);
            } 
        })
        
        const self = (e.target as HTMLButtonElement);
        const videoButton = self.cloneNode() as HTMLButtonElement;
        videoButton.textContent = "video"
        videoButton.onclick = ()=>{
            obj.dc.send(JSON.stringify({  
                id:obj.dc.label, 
            }))
        }
        self.parentNode.append(videoButton)*/
    }) 
}
//Object.assign()
</script>
{#snippet mesh(obj:InfoType)}
<details    >
    <summary   style="cursor: pointer; text-align: left;"  >
        {obj.id}
    </summary>
    <div data-facing="user" {@attach (element)=>{
        attachElement(element,obj)
        showVideo(element,obj)
        return () => {
            console.log(`${element.tagName} 即将卸载`);
        };
    }}  style="color:white;text-align: center;" id="module_list" >
        <button onclick={(e)=>{
            obj.dc.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
            }))

            
        }}>reload </button>
           
         
    </div>
</details>
{/snippet}
<svelte:head><title  >{mgtoyTitle}</title></svelte:head> 
<div class="info-panel" id="info_panel"   >
 
<details open={meshMap.size==0}   >
    <summary   style="cursor: pointer; text-align: left; "  >
        连接
    </summary>
    <div  style="color:white;text-align: center;" id="conn_list" >
    <a class="code-label" href="#info_panel" onclick={(e)=>{  
        ShowSubmit({
            connUrl,
            _comment:"自建服务器地址",
            connUrl_comment:""
        },(db)=>{            
            const src = encodeURIComponent(window.location.origin+window.location.pathname)
            const connButton = document.createElement("a")
            connButton.href = db.connUrl + "#" + src
            connButton.textContent="连接" 
            connButton.click() 
        } );
        dialogConfig.dialogEl.showModal() 
    }} >本地信令交换</a> 
    <a class="code-label" href="#info_panel" onclick={(e)=>{
        ShowSubmit(getConnHostJsonStr(),createWebrtcConnFromCenterUrl); 
        dialogConfig.dialogEl.showModal() 
    }} >跨网信令交换</a>  

    </div>
</details>
{#each meshList as m}
 
    {@render mesh( m  )}
{/each}

 
   
</div>
<Dialog {dialogConfig}   > 
    <div bind:this={dialogConfig.content} style="text-align:left" >
 
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
 
.code-label {
    font-size: 14px;
    letter-spacing: 1px;
    color: #ccdeff;
     
}
 
 
</style>