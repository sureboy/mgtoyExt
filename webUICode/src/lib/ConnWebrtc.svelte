<script lang="ts" module> 
import {handleOffer,configuration} from '$lib/webrtc' 
let link:HTMLAnchorElement=undefined
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"SolidJScad",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;

export const startConn = (sign:signalingStruct,conn:(dc:RTCDataChannel,link: HTMLAnchorElement)=>void)=>{
    const peerConnection = new RTCPeerConnection(configuration);
    handleOffer(sign,peerConnection,(answer)=>{
        link.target="_blank"
        link.textContent = "请求连接"
        link.rel = "opener"
        link.onclick=()=>{link.textContent="..."}
        link.href=sign.backUrl+"#"+encodeURIComponent(JSON.stringify(answer))
        document.getElementById("test")?.appendChild(link)
        dialogConfig.dialogEl?.showModal()
    },(receiveChannel)=>{
        receiveChannel.onopen = (e)=>{
            //console.log("open",e)
            link.textContent = sign.id
            link.href="#"
            link.target=""
            link.onclick=()=>{}
            conn(receiveChannel,link)
        }
    })
}
</script>
<script lang="ts"> 
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
import Fullscreen,{toggleFullscreen} from '$lib/Fullscreen.svelte'
import type {signalingStruct} from '$lib/utils/util'
 const {children}:{children?:any} = $props()

</script>
<Dialog {dialogConfig}   > 
     <h1>  <a bind:this={link}   rel="opener" target="_blank" href="/">请求连接 </a> </h1>
    {#if children}
        {@render children()}
  
    {/if}
        <button onclick={()=>{ 
        toggleFullscreen()
        }}>全屏</button>
    
</Dialog>
<Fullscreen></Fullscreen>