<script lang="ts" module>
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import { SvelteMap } from 'svelte/reactivity';
import {fromMessageEvent} from '$lib/utils/fromMessageEvent'
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
export const meshMap =new SvelteMap<string,any>()
export const meshList:{[key:string]:any}[] =$state([])
</script>
<script lang="ts"  >
//import { onMount } from "svelte";
//import type {infoStruct} from "$lib/utils/mainDataStruct"  
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import Dialog  from '$lib/components/Dialog.svelte'
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm' 
 //   import { isStatusOnline } from '$lib/ControlExt.svelte';

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
//Object.assign()
</script>
{#snippet mesh(obj:{[key:string]:any})}
<details    >
    <summary   style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
        {obj.id}
    </summary>
    <div {@attach (element)=>{
        console.log(`${element.tagName} 已挂载`); 
        obj.dataChannel.send(JSON.stringify({  
            name:"local" ,
            msg: 0
        }))
        obj.dataChannel.addEventListener("message",(e)=>{
            const db = JSON.parse(e.data)
            console.log(db)
            if (db.DB && db.DB.Carname ){
                const conf = {name:db.DB.Carname}
                let c = document.getElementById(conf.name)  as HTMLButtonElement
                if (c){
                    const n = isStatusOnline(db.Update)
                    if (!n){
                        c.disabled=true
                    }
                    c.textContent = n+conf.name
                    
                    return
                }
                //document.createElement('button')
                c =element.firstChild.cloneNode() as  HTMLButtonElement
                c.onclick=()=>{
                    obj.setSender(conf)
                }
                c.id = conf.name
                element.append(c)
                c.textContent =conf.name
                //dcconfig.children.push({name:db.DB.Carname})
            }
            
        })
        return () => {
            console.log(`${element.tagName} 即将卸载`);
        };
    }}  style="color:white;text-align: center;" id="module_list" >
        <button onclick={()=>{
            obj.setSender({name:"local"})
        }}>Sender </button>
           
         
    </div>
</details>
{/snippet}

<div class="info-panel" id="info_panel"  >
<details open={meshMap.size==0}   >
    <summary   style="cursor: pointer;height:48px;text-align: left;line-height: 48px;"  >
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