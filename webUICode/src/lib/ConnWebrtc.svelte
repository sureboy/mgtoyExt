<script lang="ts" module> 
import {handleOffer,configuration} from '$lib/webrtc' 
let Conn:HTMLElement
export const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    //title:"Mgtoy",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;

export const startWebRTC = (sign:signalingStruct,conn:(dc:RTCDataChannel)=>void)=>{
    const peerConnection = new RTCPeerConnection(configuration); 
    const link = document.createElement("a")
    handleOffer(sign,peerConnection,(answer)=>{ 
        link.target="_blank"
        link.textContent = "确定"
        link.rel = "opener"
        link.onclick=()=>{link.textContent="..."}
        link.href=sign.backUrl+"#"+encodeURIComponent(JSON.stringify(answer))
        Conn?.appendChild(link)
        dialogConfig.dialogEl?.showModal()
        link.click()
    },(receiveChannel)=>{ 
        Conn.innerHTML="" 
        conn(receiveChannel) 
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
    <p bind:this={Conn}>  </p>
    {#if children}
        {@render children()}
    {/if}   
</Dialog>
