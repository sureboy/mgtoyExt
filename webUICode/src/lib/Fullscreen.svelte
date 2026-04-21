<script lang="ts" module > 
let videoWrapper:HTMLVideoElement
let wakeLock = null;
export const getVideo = ()=>{
    //videoWrapper.style.display= ""
    return videoWrapper
}
// 请求唤醒锁的函数
async function requestWakeLock() {

    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('唤醒锁已激活，屏幕将保持常亮');
            wakeLock.addEventListener('release', () => {
                console.log('唤醒锁被释放');
            });
        } catch (err) {
            console.error(`无法获取唤醒锁: ${err.name}, ${err.message}`);
        }
    //}else{
        //alert("您的浏览器不支持唤醒锁");
    }
}

function enterFullscreen() {
    const elem = videoWrapper;
    //videoWrapper.muted=false
    //videoWrapper.play();
    //videoWrapper.style.display= "block"
    const requestMethod = elem.requestFullscreen  
    if (requestMethod) {
        requestMethod.call(elem).then(()=>{
            requestWakeLock()
        }).catch(err => {
            console.warn(`全屏请求失败: ${err.message}`);
            // 降级体验: 某些移动端可能被拒绝，但提示不影响使用
            //alert("无法全屏，请允许全屏权限或使用现代浏览器");
        });
    } else if (elem.webkitEnterFullScreen) {
        elem.webkitEnterFullScreen();
    } else {
        console.warn("当前浏览器不支持全屏API");
        //alert("您的浏览器不支持全屏功能");
    }   
    
    //requestWakeLock()
     
}
function isElementFullscreen() {
    // 兼容不同浏览器的全屏元素检测
    const fullscreenElement = document.fullscreenElement  
    return fullscreenElement === videoWrapper;
}
// 退出全屏模式
function exitFullscreen() {
    
    const exitMethod = document.exitFullscreen  
    if (exitMethod) {
        exitMethod.call(document).catch(err => {
            console.warn(`退出全屏失败: ${err.message}`);
        });
    } else {
        console.warn("浏览器不支持退出全屏");
    }
    //videoWrapper.style.display= "none"
    //if (wakeLock) {
    //    wakeLock.release().then(() => wakeLock = null);
    //}
    //document.removeEventListener('fullscreenchange')

}

// 切换全屏/窗口模式 (核心自定义全屏按钮逻辑)
export function toggleFullscreen() {
    if (isElementFullscreen()) {
        videoWrapper.style.objectFit = 'cover';
        exitFullscreen();

        
        //videoHtml.style.display = 'none'
    } else {
        //videoHtml.style.display = "block"
         videoWrapper.style.objectFit = 'contain';
        enterFullscreen();
         
    }
}
</script>
<script lang="ts" >
import {onMount} from "svelte"
onMount(()=>{
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement) {
            // 已退出全屏
            exitFullscreen()
            console.log('退出全屏');
            //videoHtml.style.display = 'none'
            // 在这里执行你的自定义逻辑，例如恢复按钮图标、重置UI等
        }
    });
})     
</script>
<video bind:this={videoWrapper} width="300" height="200"  autoplay muted controls playsinline webkit-playsinline></video>