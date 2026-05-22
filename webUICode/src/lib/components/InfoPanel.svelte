<script lang="ts" module>
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import { setRemoteRTCMsg } from '$lib/utils/postAndSSEWebrtc';

import { createOffer} from '$lib/webrtc' 
import {pool} from "$lib/utils/webRTCPool"
import type {connType} from "$lib/utils/webRTCPool"
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
export type meshInfoType = {
    conn:connType,
    //id:string
    //dc: RTCDataChannel,
    //pc: RTCPeerConnection,
    remoteStream?: MediaStream,
    video?:HTMLVideoElement,
    setSender?:(obj:any)=>void,
    //localStream?: MediaStream,
    //videoFacing:"user"| { exact: "environment" },
    //[key:string]:any
}
//export const meshMap =new SvelteMap<string,any>()
export const meshList:meshInfoType[] =$state([])
export const localDevice : {
    //pc?: RTCPeerConnection
    localStream?: MediaStream,
    //remoteStream?: MediaStream,
    videoFacing:"user"| { exact: "environment" },
    videoDom?:HTMLVideoElement,
}={videoFacing:"user"}
</script>
<script lang="ts"  >
//import { onMount } from "svelte";
import {getLocalStream,createVidelElement} from '$lib/utils/getLocalStream'
//import type {infoStruct} from "$lib/utils/mainDataStruct"  
import {createWebrtcConnFromCenterUrl} from "$lib/utils/postAndSSEWebrtc"
import Dialog  from '$lib/components/Dialog.svelte'
import {jsonToForm,collectFormData} from '$lib/utils/jsonToForm' 
const {fillMainArea}:{fillMainArea:(...nodes: (Node | string)[])=>void} = $props()
//export let mainArea:HTMLDivElement = null
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
const webrtcBtn = (conn: connType )=>{
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
const updateDetailsUI = (
    conf:{name:string,type:string,update:number},
    element: HTMLDivElement,
    obj:meshInfoType
)=>{
    if (!conf.name)return
    let c = document.getElementById(conf.name)  as HTMLButtonElement
    if (!c){
        c =document.createElement('button') 
        element.append(c)
        c.id = conf.name 
        c.textContent = conf.name
       
        if (conf.type==="udp"){
            c.onclick=()=>{
                //mgtoyTitle=conf.name+"-"+conf.type
                obj.setSender(conf)
            }
        }else if(conf.type==="webrtc"){ 
            c.onclick=()=>{
                let conn = pool.getConnection(conf.name)
                if (!conn){
                    conn = initWebRTC({id:conf.name,dc:obj.conn.dc})
                    createWebRTCDataChannel(conn)
                }
                
                
                webrtcBtn(conn)  
                //c.onclick = ()=>{
                //    webrtcBtn(conn) 
                //} 
            }      
            
        }
    }
    if (conf.update){
        const n = isStatusOnline(conf.update)
        if (!n){
            c.disabled=true
        }else{
            c.disabled=false
        }
        c.textContent = n+conf.name
    }
    //return c
}
const createWebRTCDataChannel = (conn: connType)=>{
    
    const dc = conn.pc.createDataChannel(conn.id,
        {ordered:false,protocol:"json"}
    )
    dc.onopen = (e)=>{
        //c.disabled = true
        conn.dc = dc
        conn.dc.addEventListener('message',ev=>{
            try{
                setRemoteRTCMsg(JSON.parse(ev.data),{pc:conn.pc,dc})
            }catch(e){
                console.error(e)
            }
        })

        updateUIWhenConn(conn)
        //JSON.parse(e.data)
    }
}
const initWebRTC = (obj:{dc:{send:(db:string)=>void},id:string})=>{
    const conn =  pool.createConnection(obj.id)
    const msg:{type:string,id:string,msg?:any} = {type:"passthrough",id:obj.id}
    conn.pc.onnegotiationneeded = ()=>{
        createOffer(conn.pc).then(sdp=>{
            if (conn.dc){
                conn.dc.send(JSON.stringify(sdp))
                return
            }
            msg.msg = sdp
            obj.dc.send(JSON.stringify(msg));
        });
    }
    conn.pc.onicecandidate = event=>{ 
        if (event.candidate) {
            if (conn.dc){
                conn.dc.send(JSON.stringify(event.candidate.toJSON()))
                return
            }
            msg.msg = event.candidate.toJSON()
            obj.dc.send(JSON.stringify(msg));
        }
    }
    conn.pc.ondatachannel = (ev)=>{
        console.log("open channel",ev.channel)
        conn.dc = ev.channel;
        updateUIWhenConn(conn)
        ev.channel.addEventListener('message',e=>{
            try{
                setRemoteRTCMsg(JSON.parse(e.data),{pc:conn.pc,dc:ev.channel})
            }catch(e){
                console.error(e)
            }
            
        })
    }
 
     
    return conn
}
const remoteTrack = (obj:meshInfoType,element: HTMLDivElement)=>{
    obj.conn.pc.ontrack = (ev)=>{
        console.log(ev)
        if (!obj.remoteStream){
            obj.remoteStream = new MediaStream()
        }
        const t = obj.remoteStream.getTracks().find(t=>t.kind===ev.track.kind)
        if (t){
            
            t.stop()
            obj.remoteStream.removeTrack(t)
        }
        obj.remoteStream.addTrack(ev.track)
        if (!obj.video){
            obj.video = createVidelElement({srcObject:obj.remoteStream,width:100})
            //localDevice.videoDom.srcObject = localDevice.remoteStream
            //fillMainArea(localDevice.videoDom)
            element.append(obj.video)
        } 
        obj.video.play()
    }
}
const updateUIWhenConn = (conn: connType)=>{
    const btn = document.getElementById(conn.id);
    if (btn){
        btn.textContent = "@"+conn.id; 
    } 
    meshList.push({conn})
}
const passthroughWebRTC = (obj:connType)=>{ 
    obj.dc.addEventListener("message",(e)=>{
        const conf = JSON.parse(e.data)
        if (conf.type !=="passthrough"){
            return
        }
        let conn = pool.getConnection(conf.id)
        if (!conn){ 
            conn = initWebRTC({id:conf.id,dc:{send:(msg:string)=>{
                conf.msg = JSON.parse(msg)
                obj.dc.send( JSON.stringify(conf))
            }}}) 
            webrtcBtn(conn) 
        }
        setRemoteRTCMsg(conf.msg,{pc:conn.pc,dc:{send:(msg)=>{
            conf.msg = JSON.parse(msg)
            obj.dc.send(JSON.stringify(conf))
        }}}) 
    })
}
const attachElement = (
    element: HTMLDivElement,
    obj:meshInfoType)=>{
        element.id = "ele_"+obj.conn.id
    //(element.firstChild as HTMLButtonElement).click();
    remoteTrack(obj,element )
    passthroughWebRTC(obj.conn)
    obj.conn.dc.addEventListener("message",(e)=>{
        const conf = JSON.parse(e.data) 
        //console.log(conf,obj)
        updateDetailsUI(conf,element,obj) 
    }) 
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
//Object.assign()
</script>
{#snippet mesh(obj:meshInfoType)}
<details    >
    <summary   style="cursor: pointer; text-align: left;height:48px; line-height: 48px;"  >
        {obj.conn.id}
    </summary>
    <div   {@attach (element)=>{
        attachElement(element,obj)
        //showVideo(element,obj)
        
        return () => {
            console.log(`${element.tagName} 即将卸载`);
        };
    }}  style="color:white;text-align: center;" id="module_list" >
        <button onclick={(e)=>{
            obj.conn.dc.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
                hasVideo:localDevice.localStream?true:false
            })) 
        }}>reload </button> 
    </div>
</details>
{/snippet}
<svelte:head><title  >{mgtoyTitle}</title></svelte:head> 
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
        ShowSubmit(getConnHostJsonStr(),createWebrtcConnFromCenterUrl); 
        dialogConfig.dialogEl.showModal() 
    }} >跨网连接</button>  

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
 
 
 
</style>