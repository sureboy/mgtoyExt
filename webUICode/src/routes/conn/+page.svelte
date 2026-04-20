<!-- App.svelte -->
<script lang="ts">
import { onMount } from 'svelte';
import Dialog from '$lib/components/Dialog.svelte'
import type {dialogStruct} from '$lib/components/Dialog.svelte'
//import type {signalingStruct} from '$lib/utils/util'
const dialogConfig:dialogStruct = {
    //open:true,
    //dialogEl:undefined,
    title:"SolidJScad",
    closeOnBackdrop:false,
    closeOnEsc:false,
} ;
const closeWindow = ()=>{
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
      dialogConfig.dialogEl?.showModal()
      link.click();
      //dialogConfig.dialogEl.showModal()
}
const postAnswer = (hashdb:string)=>{
  return new Promise<any>((resolve,reject)=>{
    fetch("/answer",{
      method:"POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: hashdb
    }).then(res=>{
      if (res.ok){
        res.json().then(resolve).catch(reject)
        
      }else{
        reject({err:res.status})
      }
      /*
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
      */
    }).catch(reject)
  })
}
const getOffer = (rbackUrl?:string )=>{
  console.log(rbackUrl)
  return new Promise<void>((resolve,reject)=>{
    fetch("/offer").then(res=>{
    if (res.ok) {
     
      //const u = "http://192.168.1.8:5173/video#"
      res.json().then((v)=>{ 
        v.backUrl = window.location.origin +window.location.pathname
        
         
        const u =rbackUrl ||   "https://mgtoy.cn/"
        const link = document.createElement("a");
        link.href=u+"#"+encodeURIComponent(JSON.stringify(v))
        link.textContent=rbackUrl
        document.getElementById("test")?.appendChild(link)
        dialogConfig.dialogEl?.showModal()
    
        link.click();
        resolve()
        //link.target="_blank"
        //console.log(val)
      })
    }else{
      reject({err:res.status})
    }
  }).catch(reject)
  })
}
onMount(()=>{
  if (window.location.hash){
    const hashdb = decodeURIComponent(window.location.hash.slice(1))
    
    if (hashdb){
      if (hashdb.startsWith("http://")){
        getOffer(hashdb).catch(console.error)
      }else{
        postAnswer(hashdb).then(()=>{
          closeWindow()
        }).catch(console.error)
      }

      return
    }
  }
  //getOffer(document.referrer).catch(console.error)
  
})
  // 或 import PlaylistPlayer from './PlaylistPlayer.svelte';
</script>
 

<Dialog {dialogConfig}   >
<p id="test"></p>
</Dialog>