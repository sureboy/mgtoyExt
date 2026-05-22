
export type facingMode ="user"| { exact: "environment" } |ConstrainDOMString
export async function getLocalStream(facingMode:ConstrainDOMString = "user" ) { 
    try {
        const localStream = await navigator.mediaDevices.getUserMedia({ 
            video:{facingMode},// (cameraNumber<=cameraID)?true:{ deviceId: { exact: videoDevices[cameraID].deviceId } },
            audio:{
                echoCancellation: true,   // 开启回声消除
                noiseSuppression: true,   // 建议同时开启降噪
                autoGainControl: true     // 建议同时开启自动增益
            }, 
        });
        console.log('使用摄像头'); 
        return localStream ;
    } catch (error) { 
        //alert(error);
        console.log(error);
        //return;
        //return undefined;
        //console.log( error);
        try{
            
            const localVideo = document.createElement("video") ;
            localVideo.src = '/test.mp4'; // 替换为你的文件路径
            localVideo.loop = true;     // 循环播放
            localVideo.muted = true;     // 必须静音，否则可能无法自动播放
            localVideo.autoplay = true;  
            return  new Promise<MediaStream>((resolve,reject) => {
                localVideo.onloadeddata = (e) => {
                    
                    localVideo.play();
                    if (localVideo.captureStream){
                        resolve( localVideo.captureStream() );
                    }else if (localVideo["mozCaptureStream"]){
                        resolve( localVideo["mozCaptureStream"]() );
                    }else{
                        reject("no stream");
                    }
                    
                };
                localVideo.onerror = (e)=>{
                    reject(e);
                };
            });
            //await localVideo.play(); 
            //return {localStream:localVideo.captureStream()};
        }catch(e){
            throw e;
            //console.log(e);
            //return undefined
        } 
    }
}
export const createVidelElement = (opt?:{[key:string]:any})=>{
    const video = document.createElement('video');
    video.style.objectFit = 'cover';
    video.autoplay=true;
    video.muted=true;
    video.controls=true;
    video['playsinline']=true;
    video['webkit-playsinline']=true;
    function resizeCanvasAndUpdate() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        video.width = w;
        video.height = h;
 
    }
    if (opt){
        Object.assign(video,opt);
        //video.srcObject = srcObj
    }
    window.addEventListener('resize', resizeCanvasAndUpdate);
    /*
    video.addEventListener('close',()=>{
        window.removeEventListener('resize',resizeCanvasAndUpdate)
    })*/
    resizeCanvasAndUpdate();
    return video;
};