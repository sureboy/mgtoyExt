<script lang="ts" module> 
import {handleOffer,configuration} from '$lib/webrtc' 
//let link:HTMLAnchorElement=undefined
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;

export const startWebRTC = (sign:signalingStruct,conn:(dc:RTCDataChannel)=>void)=>{
    const peerConnection = new RTCPeerConnection(configuration);
    //dialogConfig.closeHandle=()=>{
    //    peerConnection.close()
    //}
    const link = document.createElement("a")
    handleOffer(sign,peerConnection,(answer)=>{
        
        link.target="_blank"
        link.textContent = "发送answer"
        link.rel = "opener"
        link.onclick=()=>{link.textContent="..."}
        link.href=sign.backUrl+"#"+encodeURIComponent(JSON.stringify(answer))
        document.getElementById("conn")?.appendChild(link)
        dialogConfig.dialogEl?.showModal()
    },(receiveChannel)=>{
        //receiveChannel.onopen = (e)=>{
            //console.log("open",e)
        document.getElementById("conn").style.display = "none"
        conn(receiveChannel)
        //}
    })
}
</script>
<script lang="ts"> 
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'

import type {signalingStruct} from '$lib/utils/util'
 const {children}:{children?:any} = $props()

</script>
<Dialog {dialogConfig}   > 
     <p id="conn">  </p>
    {#if children}
        {@render children()}
  
    {/if}
  
    
</Dialog>
