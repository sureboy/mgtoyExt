<script lang="ts">
  import { onMount } from 'svelte';
let carname:HTMLInputElement

const updateCarButton = (name,v,btn)=>{
    if (!v.url || !v.uri){
        return null
    }
    btn.style.display="block"
    btn.innerHTML = name +btn.innerHTML
    btn.id = name
    btn.dataset.Control = v.url
    btn.dataset.uri = v.uri
    btn.href = "#"+name
    btn.classList.remove('active')  
    return btn
}
const fetchAPI = ()=>{
    let uri = "/api"
    //let hashkey
    if (window.location.hash){
        //hashkey = 
        uri+="?name="+window.location.hash.substring(1)
    }
    fetch(uri).then(res=>{
        if (res.ok)
        res.json().then(data=>{
            const groupCar = document.getElementById("groupCar")
            data.dbs.forEach(v=>{
                let btn = document.getElementById(v.name)
                if (btn){
                    btn.dataset.Control = v.url
                    btn.dataset.uri = v.uri
                }else{
                    btn = groupCar.firstChild.cloneNode(true) as HTMLElement
                    groupCar.appendChild(updateCarButton(v.name,v,btn))
                }
                if (data.key === v.name){
                    btn.style.color = "red"
                    btn.lastChild.textContent=">"
                }
                //cache_map.set(v.name, v.url) 
                window.localStorage.setItem(v.name, JSON.stringify(v))
            })
        })
        else {
            if (window.location.hash){
                const btn = document.getElementById(window.location.hash.substring(1))
                if (btn){
                    btn.lastChild.textContent="x"
                   // btn.lastChild.style.display = "inline-block"
                    //btn.innerHTML += '<button class="close-btn" aria-label="Close">×</button>'
                }
            }
        }
    }).catch(e=>{ 
        console.log(e)
    }) 
}
const handlebutton = (e) => {
    //e.preventDefault()
    const button = e.target.closest('button');
    if (!button){ 
        return
    } 
    //button.click()
    if (!button.parentElement.id)return
    if (button.textContent==="x"){        
        if (confirm(`delete ${button.parentElement.id}?`)){
            window.localStorage.removeItem(button.parentElement.id)
            window.location.hash=""
            window.location.reload()
        }
    }else{
        window.open(button.parentElement.dataset.uri, "_blank");
    }
    
    
    

    //console.log(button.parentElement.id)
 
  
};
const initButtonList = ()=>{
    const groupCar = document.getElementById("groupCar")
    const btn = groupCar.firstChild as HTMLElement
    btn.style.display="none"
    //btn.lastChild.style.display = "none"
    //groupCar.innerHTML='' 
    let storageLen = window.localStorage.length
    while (storageLen){
        storageLen--
        const k = window.localStorage.key(storageLen)
        //console.log(k,storageLen)
        //cacheMap.set(k,window.localStorage.getItem(k))
        const v =JSON.parse(window.localStorage.getItem(k))
        //const btn_clone = btn.cloneNode(true) 
        
        groupCar.appendChild(updateCarButton(k,v ,btn.cloneNode(true)))
    }
}
const longClickHandle = (e)=>{
    const aclick = e.target.closest('a');
    if (!aclick)return
    e.preventDefault()
    let pressTimer = setTimeout(() => {
        console.log(aclick.id)
        //startMic()
    }, 1500);
    //console.log(aclick.id)
    aclick.addEventListener('mouseup', ()=>clearTimeout(pressTimer));
    aclick.addEventListener('mouseleave', ()=>clearTimeout(pressTimer));
    aclick.addEventListener('touchmove', ()=>clearTimeout(pressTimer))
    aclick.addEventListener('touchend', ()=>clearTimeout(pressTimer))
}
onMount(()=>{
   carname.addEventListener("input",(e)=>{
        if (carname.value.length==6){
            let aTag = document.createElement('a'); 
            aTag.href = "#"+carname.value;
            aTag.click();   
        }
        //console.log(e,carname.value)
        
    })
    const groupCar = document.getElementById("groupCar")
    groupCar.addEventListener("click", handlebutton  );
    groupCar.addEventListener("mousedown", longClickHandle  );
    groupCar.addEventListener("touchstart", longClickHandle  );
    //groupCar.addEventListener("click", handlebutton , { passive: false });

    //updateCarList();
    initButtonList();
    fetchAPI()
})

</script>
 
<div class="wifi-connect-container" id="scanDiv"  > 
    <div class="form-group name-input">
        <input
        bind:this={carname}
        id="carname"
        type=  'test'
        maxlength="6"
        placeholder="Input MGToy Code" />
    </div>

    <div class="groupButton" id="groupCar" >
        <a  id="test" href="#test"  >
            <button class="close-btn" aria-label="Close">></button> 
        </a>

    </div>
</div>
<style>
.form-group {
    margin-bottom: 20px;
}  
 
a .close-btn {
  /* 基础样式 */
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  
  /* 图标样式 */
  font-size: 24px;
  line-height: 1;
  color: #999;
  transition: all 0.3s ease;

  /* 圆角设计 */
  border-radius: 50%;
  
  /* 居中内容 */
  display:inline-block;
  align-items: center;
  justify-content: center;
}

/* 悬停效果 */
a .close-btn:hover {
  color: #333;
  background: rgba(0,0,0,0.1);
}

/* 点击效果 */
a .close-btn:active {
  transform: scale(0.9);
}
.name-input {
      position: relative;
    }
    
    .name-input input {
      width: 95%;
      padding: 12px 16px;
      padding-right: 0px;
      border: 1px solid #dadce0;
      border-radius: 8px;
      font-size: 16px;
    }
    
    .name-input input:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }
    
    .groupButton {
      display: flex;
      flex-wrap: wrap;
      margin: 20px 0;
      justify-content: center;
    }
    .groupButton a{
      text-decoration: none;
        font-size: 24px;
    border: none;
    border-radius: 10px;
    background-color: #ddd;
    cursor: pointer;
    transition: all 0.2s;
    font-size:xx-large;
    color: white;
    padding: 10px 20px;
    margin: 5px;
    }
 
    .groupButton a:hover {
    background-color: #ccc;
  }
  
  .groupButton a:active {
    transform: scale(0.95);
  }
    
</style>