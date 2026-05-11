<script lang="ts">  
import BlinkEyes from '$lib/components/BlinkEyes.svelte';
import InfoPanel from "$lib/components/InfoPanel.svelte";
import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte"
import {connWebRTC ,createRtcTrack,createOffer} from '$lib/webrtc'
import ConnWebrtc,{ startWebRTC,dialogConfig} from '$lib/ConnWebrtc.svelte'; 
import type {infoStruct,signalingStruct} from "$lib/utils/mainDataStruct" 
import {createCmdSender} from "$lib/utils/wheelCmdSender"
//import {decodeBase64} from "$lib/utils/util"
//    import { clearInterval } from 'node:timers';
//let canvas:HTMLCanvasElement
let sender:(n:number)=>void = undefined
const infoData:infoStruct= {cars:[]}


const initDataChannelListener = (dataChannel: RTCDataChannel)=>{
    dataChannel.addEventListener("message",(e)=>{
        //console.log(e)
        const db = JSON.parse(e.data)
        if (db.DB && db.DB.Carname){
            const car = {name:db.DB.Carname}
            const timeOut = (Date.now() - db.Update)/6000
            let car_ = document.getElementById(db.DB.Carname) as HTMLAnchorElement
            if (!car_){
                car_=infoData.info.firstChild.cloneNode() as HTMLAnchorElement;// document.createElement('a')
                car_.href="#"+car.name
                car_.id = car.name
                car_.onclick = ()=>{
                    infoData.codeInput.value = JSON.stringify(car)
                }
                infoData.info.append(car_)
            }
            console.log(timeOut)
            if (timeOut>=1){
                car_.textContent = car.name
            }else{
                car_.textContent=car.name+":"+(100-timeOut  *100).toFixed(0) +"%"
            } 
        }
        console.log(db,infoData.info) 
    }) 
}
const initDataChannelSender = (dataChannel: RTCDataChannel)=>{
    dataChannel.send(JSON.stringify({  
        name:"local" ,
        msg: 0
    }))
    sender= n=>{ 
        dataChannel.send(JSON.stringify(
            Object.assign(
                {msg:n},
                JSON.parse(infoData.codeInput.value)
            )   
        ))
    } 
}
const init = (dataChannel: RTCDataChannel)=>{
    initDataChannelListener(dataChannel) 
    initDataChannelSender(dataChannel) 
}
const createRtcConn = (send:(iceOrSdp:string)=>void,obj={id:"test",create:true})=>{
    const outOjb = {
        pc:createRtcTrack((ice)=>{
            outOjb.dc.send(JSON.stringify(ice))
        }),
        dc:{send}
    }
 
    const dc = outOjb.pc.createDataChannel(obj.id,{ordered:false})
    dc.onopen=()=>{
        outOjb.dc = dc
        console.log("dc open")

    }
    dc.onmessage=(e)=>{
        setRemoteRTCMsg(JSON.parse(e.data),outOjb)
    }
    outOjb.pc.onnegotiationneeded = ()=>{
        createOffer(outOjb.pc).then(sdp=>{
            outOjb.dc.send(JSON.stringify(sdp))
        })
    }
    return outOjb
}
const appendRtcConn = (send:(ice:string)=>void)=>{
 
    const obj:{pc:RTCPeerConnection,dc:{send(data:string):void}} = {
        pc: createRtcTrack((ice)=>{
        obj.dc.send(JSON.stringify(ice))
    }),dc:{send}}
    obj.pc.ondatachannel = (e)=>{
        obj.dc = e.channel
        console.log("dc open")
        e.channel.onmessage=(e)=>{
            setRemoteRTCMsg(JSON.parse(e.data),obj)
        }
    }
    return obj
}
const postWebRTCMsg = (obj={id:"",create:false,host:"http://127.0.0.1:8088/"})=>{
    return fetch(obj.host,{
        method:"POST",
        headers: {
            "Content-Type": "application/json"   // 告诉服务器发送的是 JSON
        },
        body: JSON.stringify(obj) 
    })
}
const getWebRTCMsgFromSSE = (msg:(msg:any)=>void,obj={id:"",host:"http://127.0.0.1:8088/"})=>{
    let u=obj.host+"?" 
    for (const [k,v] of Object.entries(obj)){
        u+=`${k}=${v}&`
    }
    const source = new EventSource(
        u ,
        {withCredentials:false}
    );
    source.onmessage = function(event) { 
        try{ 
            msg(JSON.parse(atob(event.data))) 
        }catch(e){
            const obj = {msg:event.data,online:true}
            msg(obj)
            if (!obj.online){
                source.close()
                console.log("close source",source.CLOSED)
            }
            //console.log(e)
            //console.log(event.data )
        } 
    };
    source.onerror = (e)=>{
        console.error(e)
        source.close()
    }
}
const setRemoteRTCMsg = (MsgObj:any,conn:{pc: RTCPeerConnection,dc:{send(data: string): void}},maxNum=10)=>{
    console.log(MsgObj)
    if (MsgObj.candidate){
        
        conn.pc.addIceCandidate(new RTCIceCandidate(MsgObj)).then(()=>{
            //console.log( MsgObj );
        }).catch(e=>{
            maxNum--
            if (maxNum>0){
                setTimeout(()=>{
                setRemoteRTCMsg(MsgObj,conn,maxNum)
            },2000)
            }
            
            console.error(e)
        }) 
        return;
    }
    if (MsgObj.sdp){ 
        conn.pc.setRemoteDescription(new RTCSessionDescription(MsgObj)).then(()=>{
            if (MsgObj.type==="offer"){
                conn.pc.createAnswer().then(sdp=>{
                    conn.pc.setLocalDescription(sdp);
                    conn.dc.send(JSON.stringify(sdp));                 
                })
            } 
        }).catch(e=>{
            console.error(e)
        });  
        return
    }
    if (MsgObj.online){
        MsgObj.online = !('onmessage' in conn.dc)
        return
    }
}
const createWebrtcConnFromCenterUrl = (obj={id:"",create:true,host:"http://127.0.0.1:8088/"})=>{
    postWebRTCMsg(obj ).then(r=>{
        if (r.ok){
            if (obj.create){ 
                const conn = createRtcConn((msg)=>{
                    postWebRTCMsg(Object.assign({msg:btoa(msg)},obj) )
                },obj) 
                getWebRTCMsgFromSSE((MsgObj)=>{
                    setRemoteRTCMsg(MsgObj,conn) 
                    if ("onmessage" in conn.dc){
                        return false
                    }else{
                        return true
                    }
                } ,obj )
            }else{ 
                r.json().then(db=>{
                    const conn = appendRtcConn((msg)=>{ 
                        postWebRTCMsg(Object.assign({msg:btoa(msg)},obj) )
                    }); 
                    (db as any[]).forEach(v=>{
                        setRemoteRTCMsg(JSON.parse(atob(v)),conn)
                        //console.log()
                    });
                })
            }
            
             
            
        }
    })
}
onMount(()=>{ 
    if (window.location.hash){
        const hashdb = window.location.hash.slice(1)
        if (hashdb){
            try{
                const sign = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as signalingStruct
                location.hash = ''; 
                startWebRTC(sign,(receiveChannel)=>{ 
                    init (receiveChannel)  
                })
                return
            }catch(e){
                console.log(e) 
            } 
        }
    }
    connWebRTC().then((res) =>{  
        init(res.dataChannel)
    }).catch(e=>{
        infoData.codeInput.value=JSON.stringify({
            id:Date.now().toString(32).slice(4),
            create:false,
            host:"https://www.zaddone.com/rtc"})
        infoData.sendBtn.onclick = (e)=>{
            //if (infoData.codeInput.value.startsWith("webrtc:"))
            createWebrtcConnFromCenterUrl(JSON.parse(infoData.codeInput.value))
        }
        
    })
})
</script>
<svelte:head><title  >mgtoy</title></svelte:head> 
<div class="bg"><BlinkEyes></BlinkEyes></div>
<Joystick clickEvent={createCmdSender((n)=>{
    //console.log( n]]);
    if (sender)sender(n)
})}></Joystick>
<InfoPanel {infoData} ></InfoPanel>
<footer>🎥 摄像头视频背景 | 半透明摇杆 | 拖拽右下角 → 8方向 + 中心停止</footer>
    <ConnWebrtc>
        <p id="init">   </p>
        <p id="camera"> </p>
        <p id="video" > </p>
    </ConnWebrtc>
<style>
footer {
    position: fixed;
    bottom: 12px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: #ccc;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    padding: 6px;
    z-index: 99;
    pointer-events: none;
    font-weight: 400;
}
 
/* 视频全屏背景层 */
.bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;   /* 覆盖全屏，保持比例裁剪 */
    z-index: 1;
    background: #000;
}

 
</style>