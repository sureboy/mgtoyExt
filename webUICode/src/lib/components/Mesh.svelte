<script lang='ts' module>
import type {connType} from "$lib/utils/webRTCPool"
export type meshInfoType = {
    conn:connType, 
    remoteStream?: MediaStream,
    video?:HTMLVideoElement,
    //main?:string,
    setSender?:(obj:any)=>void, 
} 
</script>
<script lang="ts">  
import { setRemoteRTCMsg } from '$lib/utils/postAndSSEWebrtc';
import {pool} from "$lib/utils/webRTCPool"
import {updateUIWhenConn,webrtcBtn,mgtoyTitle} from "$lib/components/InfoPanel.svelte"
import {createVidelElement} from '$lib/utils/getLocalStream' 
import { onMount } from "svelte";
import { createOffer} from '$lib/webrtc' 
import {
    handleFile,
    //insertScriptAtBodyStart,
    replaceAssetPathsAdvanced,
    startHandleFile} from '$lib/utils/opfs'
let element: HTMLDivElement
let Iframe:HTMLIFrameElement|undefined
const urlList:string[] = []
const {mesh,fillMainArea}:{
    mesh:meshInfoType,
    fillMainArea:(...nodes: (Node | string)[])=>void} = $props()
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
const updateDetailsUI = (
    child:{name:string,type:string,update:number },
    element: HTMLDivElement,
    obj:meshInfoType
)=>{
    if (!child.name)return
    let c = document.getElementById(child.name)  as HTMLButtonElement
    if (!c){
        c =document.createElement('button') 
        element.append(c)
        c.id = child.name 
        c.textContent = child.name
        switch (child.type){
        case "udp" :
            if (child.update){
                const n = isStatusOnline(child.update)
                //if (!n){
                    //c.disabled=true
                //}else{
                    c.disabled=false
                //}
                c.textContent = n+child.name
            }
            c.onclick=()=>{
                mgtoyTitle.id= obj.conn.id
                mgtoyTitle.child = child.name
                Iframe.contentWindow.postMessage({client:child})
                //mgtoyTitle=conf.name+"-"+conf.type
                //obj.setSender(child)
            }
            break;
        case "webrtc":
            c.onclick=()=>{
                let conn = pool.getConnection(child.name)
                if (!conn){
                    conn = initWebRTC({id:child.name,dc:obj.conn.dc})
                    createWebRTCDataChannel(conn)
                }
                
                
                webrtcBtn(conn)   
            }      
            break;
        case "file":
            c.onclick=async ()=>{
                console.log(child.name)
                try{ 
                    //const root = await navigator.storage.getDirectory();
                    updateFileFromDataChannel(child.name,
                        obj.conn.pc.createDataChannel(child.name,{ordered:true}), 
                        (code)=>{
                            switch (child.name.split(".").pop()){
                                case "html":
                                    showHtml(child.name,code).then(f=>{
                                        Iframe=f
                                    });
                                    break;
                            }
                        }
                    ) 
                }catch(e){
                    console.error(e)
                }
            }
            break;
        }
    }

    //return c
}
const showHtml =async ( path:string,code:string)=>{
    while(true){
        const u = urlList.pop()
        if (!u){
            break
        }
        URL.revokeObjectURL(u)

    }
    
    code =await replaceAssetPathsAdvanced(code,(origin)=>{
        return new Promise<string>((resolve,reject)=>{
            let t = setTimeout(() => {
                resolve(origin)
            }, 2000);
            updateFileFromDataChannel(path,
                mesh.conn.pc.createDataChannel(origin,{ordered:true}), 
                (v)=>{
                    //console.log(v)
                    const url = URL.createObjectURL(
                        new Blob(
                            [v],
                            { type: contentType['.'+origin.split(".").pop()] || 'text/plain' }
                        )
                    )
                    urlList.push(url)
                    resolve(url)
                },()=>{
                    try{
                        if (t){
                            clearTimeout(t)
                            t=null
                        }
                    }catch(e){
                        console.log(e)
                    }
                    
                }
            )
        }) 
        
        //return "origin"
    })
    //code = insertScriptAtBodyStart(code,`window.postMessage=(db)=>{}`)
    //const doc =  new DOMParser().parseFromString(code, 'text/html');
    //fillMainArea(doc.firstElementChild)
    const iframe = document.createElement('iframe')
    /*
    iframe.src = URL.createObjectURL(
        new Blob(
            [code],
            { type: contentType['.html'] || 'text/plain' }
        )
    )*/
    iframe.srcdoc = code
    //urlList.push(iframe.src)
    const resizeIframe = ()=>{
        iframe.width = window.innerWidth.toString(); 
        iframe.height = window.innerHeight.toString();
    }
    resizeIframe()

    //iframe.addEventListener('load')
    //window.addEventListener('resize',resizeIframe)
    iframe.style.border="0";
    fillMainArea(iframe)
    window.onresize  =()=> resizeIframe()
    iframe.onload = () => { 
        //URL.revokeObjectURL(iframe.src)
        //obj.conn.dc.addEventListener('message',(ev)=>{ 
        //    iframe.contentWindow.postMessage(JSON.parse(ev.data))
        //})
        window.onmessage = (event:any) => {
            console.log("listener message",event)
            const conn = pool.getConnection(mgtoyTitle.id) 
            if (conn){
                conn.dc.send(JSON.stringify(Object.assign({name:mgtoyTitle.child},event.data)))
            }else{
                mesh.conn.dc.send(JSON.stringify(Object.assign({name:mgtoyTitle.child},event.data)))
            } 
        }
    } 
    
    return iframe
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
const contentType:{ [key: string]: string } = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wasm':'application/wasm',
};
async function ensureDirectory(root:FileSystemDirectoryHandle, name:string) {
  // 先尝试获取为目录
  try {
    return await root.getDirectoryHandle(name, { create: true });
  } catch (e) {
    console.error(e)
    await root.removeEntry(name, { recursive: false }); // 删除文件
    return await root.getDirectoryHandle(name, { create: true });
  }
}
async function updateFileFromDataChannel( path:string,file:RTCDataChannel,fileStr:(v:string)=>void,runEvent?:(n:number)=>void) {
    //const file = conn.pc.createDataChannel(name,{ordered:true})
    //URL.parse()
    const handle =await startHandleFile(path,encodeURIComponent(file.label))
    //const dir = await ensureDirectory(root ,encodeURIComponent(path) )
    //console.log(file.label)
    //root.getDirectoryHandle
    //console.log(encodeURIComponent(new URL(file.label,window.location.href).pathname))
    //const fileHandle = await dir.getFileHandle(
    //    encodeURIComponent( file.label ) , { create: true });
    //console.log(file.label,"handle")
    //const fileWritable = await fileHandle.createWritable(); 
    
    file.onmessage =async ev=>{  
        //console.log(ev.data)
        if (typeof ev.data === "string"){
            
            //console.log(file.label,"end")
            const code = await handleFile(await handle.getFile() ).finally(()=>{
                handle.close();
                file.close() 
            }) 
            fileStr(code)
            
            
        }else{
            handle.write(ev.data)
            if (runEvent)
            runEvent((ev.data as ArrayBuffer).byteLength)
        }
    } 
}
//let attachElement:( element: HTMLDivElement, obj:meshInfoType)=>void 
onMount(()=>{
    console.log(element)
    element.id = "div_"+mesh.conn.id
    remoteTrack(mesh,element )
    passthroughWebRTC(mesh.conn)
    mesh.conn.dc.addEventListener("message",(e)=>{
        const conf = JSON.parse(e.data) 
        console.log("obj",conf)
        updateDetailsUI(conf,element,mesh) 
        Iframe?.contentWindow.postMessage(conf)
    }) 
})
</script>
<details    >
    <summary   style="cursor: pointer; text-align: left;height:48px; line-height: 48px;"  >
        {mesh.conn.id}
    </summary>
    <div   bind:this={element}  style="color:white;text-align: center;" >
        <button onclick={(e)=>{
            mesh.conn.dc.send(JSON.stringify({  
                name:"local" ,
                msg: 0,
                 
            })) 
        }}>reload </button> 
    </div>
</details>