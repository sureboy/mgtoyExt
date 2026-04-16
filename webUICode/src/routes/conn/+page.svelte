<!-- App.svelte -->
<script lang="ts">
import { onMount } from 'svelte';
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'

const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"SolidJScad",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
onMount(()=>{
  if (window.location.hash){
    fetch("/answer",{
      method:"POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: decodeURIComponent(window.location.hash.slice(1))
    }).then(res=>{
      try{
        window.opener?.close();
        window.close();
      }catch(e){
        console.error(e)
      }
      const link = document.createElement("a")
      link.target="_blank"
      //link.rel = "opener"
      link.textContent = "点击回到mgtoy.cn中操作"
      link.onclick=()=>{
        window.close();
        window.history.back();
      }
      //link.href=sign.backUrl+"#"+encodeURIComponent(ans)
      document.getElementById("test")?.appendChild(link)
      dialogConfig.dialogEl?.show()
      link.click();
      //dialogConfig.dialogEl.showModal()
    }).catch(e=>{
      console.error(e)
    })
    //window.close();
    return
  }
  fetch("/offer").then(res=>{
    if (res.ok) {
      const u =document.referrer || "https://mgtoy.cn/video#"
      //const u = "http://192.168.1.8:5173/video#"
      res.json().then(v=>{ 
        v.backUrl = window.location.href
        const link = document.createElement("a");
        link.href=u+encodeURIComponent(JSON.stringify(v))
        link.click();
        
        //link.target="_blank"
        //console.log(val)
      })
    }
  }).catch(e=>{
    console.error(e)
  })
})
  // 或 import PlaylistPlayer from './PlaylistPlayer.svelte';
</script>
 

<Dialog {dialogConfig}   >
<p id="test"></p>
</Dialog>