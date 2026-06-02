<script lang="ts" module>
import type {dialogStruct} from '$lib/components/Dialog.svelte' 
import {pool} from "$lib/utils/webRTCPool"
import type {connType} from "$lib/utils/webRTCPool"
import type {meshInfoType} from '$lib/components/Mesh.svelte'
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
 
//export const meshMap =new SvelteMap<string,any>()
const meshList:meshInfoType[] =$state([])
export const addMesh = (m:meshInfoType)=>{ 
    for (let i=0;i<meshList.length;i++){
        const v = meshList[i]
        if (v.conn.id ===m.conn.id){
            meshList[i] = m
            return
        }
    }
    const len = meshList.length;
    m.conn.onClose = ()=>{
        meshList[len] = null
        console.log("----",m)
    }
    meshList.push(m)
}
export const mgtoyTitle = $state({id:"mgtoy",child:""}) 
export const localDevice : {
    //pc?: RTCPeerConnection
    localStream?: MediaStream, 
    //remoteStream?: MediaStream,
    videoFacing:"user"| { exact: "environment" },
    videoDom?:HTMLVideoElement,
}={videoFacing:"user"}
export const updateUIWhenConn = (conn: connType)=>{
    const btn = document.getElementById(conn.id);
    if (btn){
        btn.textContent = "@"+conn.id; 
    } 
    const m = {conn}
    addMesh(m)
    //meshList.push(m)

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
const startLocalStream = (stream:(m?: MediaStream)=>void)=>{
    if (localDevice.localStream){
        stream(localDevice.localStream)
        return
    }
    getLocalStream(localDevice.videoFacing).then((localStream)=>{
        stream(localStream)
        localDevice.localStream = localStream
    }).catch(e=>{
        stream()
        console.log(e)
    })
}
export const webrtcBtn = (conn: connType )=>{
    dialogConfig.dialogEl.showModal() 
    startLocalStream(m=>{
        
        const jsonTable = {
            _comment:conn.id,
            //data:true
        }
        if (m){
            m.getTracks().forEach(v=>{
                Object.assign(jsonTable,{[v.kind]:true})
            })
        }
        ShowSubmit(jsonTable,(db)=>{            
            console.log(db) 
            //const conn = initWebRTC(initConf)
            const sender = conn.pc.getSenders()
            m.getTracks().forEach(t=>{
                const s = sender.find(f=>f.track && f.track.kind===t.kind)
  
                if (db[t.kind]){
                    if (!s){
                        conn.pc.addTrack(t,m)
                    }else{
                        s.replaceTrack(t)
                    }
                }else{
                    if (s){
                        //s.track.stop()
                        conn.pc.removeTrack(s)
                    }
                    
                }
            })            
        } );
    }) 
}
</script>
<script lang="ts"  >
//import { onMount } from "svelte";
import Mesh  from '$lib/components/Mesh.svelte' 
import {getLocalStream} from '$lib/utils/getLocalStream' 
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import Dialog  from '$lib/components/Dialog.svelte'
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm'  
const {fillMainArea}:{fillMainArea:(...nodes: (Node | string)[])=>void} = $props()

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
</script>
<svelte:head><title  >{mgtoyTitle.child?(mgtoyTitle.id+'-'+mgtoyTitle.child):mgtoyTitle.id}  </title></svelte:head> 
<div class="info-panel" id="info_panel"   >
    <button  onclick={(e)=>{
        getLocalStream(localDevice.videoFacing).then((localStream)=>{ 
            //console.log(1)
            if (pool.getConnectionCount()===0){
                localDevice.localStream = localStream; 
                //const b = (e.target as HTMLButtonElement)
                (e.target as HTMLButtonElement).textContent = "Change video"
                return
            } 
            if (localDevice.videoFacing==="user"){
                localDevice.videoFacing = { exact: "environment" }
            }else{
                localDevice.videoFacing = "user"
            }    
            /*  
            pool.getAllConnectionIds().forEach(id=>{
                const conn = pool.getConnection(id) 
                const senders = conn.pc.getSenders(); 
                localStream.getTracks().forEach(track => {
                    const videoSender = senders.find(sender => sender.track && sender.track.kind === track.kind);
                    if (!videoSender) {
                        localDevice.localStream.addTrack(track)
                        conn.pc.addTrack(track, localDevice.localStream); 
                    }else{ 
                        //const tr = localDevice.localStream.getTracks().find(t =>   t.kind === track.kind);
                        //tr.stop()
                        videoSender.track.stop()
                        localDevice.localStream.removeTrack(videoSender.track)
                        localDevice.localStream.addTrack(track)
                        
                        videoSender.replaceTrack(track);
                    } 
                })                    
            })*/
            
        })
    }}>local Video</button>
<details open    >
    <summary   style="cursor: pointer; text-align: left; height:48px; line-height: 48px;"  >
        webRTC连接
    </summary>
    <div  style="color:white;text-align: center;" id="conn_list" >
    <button   onclick={(e)=>{  
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
    }} >本地连接</button> 
    <button   onclick={(e)=>{
        ShowSubmit(getConnHostJsonStr(),(db)=>{
            createWebrtcConnFromCenterUrl(db,(conn)=>{
                addMesh({conn})
            })
        }); 
        dialogConfig.dialogEl.showModal() 
    }} >跨网连接</button>  

    </div>
</details>
{#each meshList as mesh} 
{#if mesh}
<Mesh  {mesh} {fillMainArea}></Mesh> 
 {/if}
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
 
 
 
</style>