
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
        return {localStream };
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
            await new Promise((resolve) => {
                localVideo.onloadeddata = (e) => {
                    resolve(e);
                };
            });
            await localVideo.play(); 
            return {localStream:localVideo.captureStream()};
        }catch(e){
            console.log(e);
            //return undefined
        } 
    }
}