export const getFace = (video: HTMLVideoElement)=>{
    const canvas = document.createElement("canvas");
    
    const ctx = canvas.getContext('2d');
   // 画布实际尺寸（未旋转前的逻辑尺寸，我们固定为竖屏尺寸 1080x1920 风格，但会根据窗口调整）
    let canvasWidth = 0, canvasHeight = 0;
    // 绘图基准坐标（未旋转时的中心）
    let centerX, centerY;
    let eyeRadius, eyeXOffset, eyeYPos;
    let mouthStartX, mouthEndX, mouthCtrlY, mouthBaseY;
    
    // 眨眼控制
    let isBlinking = false;
    let blinkEndTime = 0;
    let nextBlinkTime = 0;
    const BLINK_DURATION = 150;
    const MIN_INTERVAL = 2000;
    const MAX_INTERVAL = 5000;
    
    // 全屏状态与旋转角度
    let isFullscreen = false;
    //let currentRotation = 0;   // 0, 90, -90 (度) 用于修正画布方向
    //let lastOrientation = 0;
    
    // 辅助函数
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function scheduleNextBlink(now) {
        const interval = randomInt(MIN_INTERVAL, MAX_INTERVAL);
        nextBlinkTime = now + interval;
    }
    
    function startBlink(now) {
        if (isBlinking) {return;}
        isBlinking = true;
        blinkEndTime = now + BLINK_DURATION;
    }
    
    function updateBlinkState(now) {
        if (isBlinking && now >= blinkEndTime) {
            isBlinking = false;
        }
        if (!isBlinking && nextBlinkTime === 0) {
            scheduleNextBlink(now);
        }
        if (!isBlinking && nextBlinkTime !== 0 && now >= nextBlinkTime) {
            startBlink(now);
            scheduleNextBlink(now);
        }
    }
    
    // 根据当前屏幕方向计算需要的旋转角度（使绘制的图案始终朝上）
    // 核心：检测屏幕是竖屏还是横屏，以及设备方向角，进行补偿
    function getRotationAngle() {
        // 获取屏幕方向 (角度)
        let orientationAngle = 0;
        if (screen.orientation && screen.orientation.angle !== undefined) {
            orientationAngle = screen.orientation.angle;
        } else if (window.orientation !== undefined) {
            orientationAngle = window.orientation;
        } else {
            // 降级：根据宽高比猜测
            if (window.innerWidth > window.innerHeight) {return 90;}
            else {return 0;}
        }
        // orientationAngle 通常为 0, 90, -90, 180
        // 我们想让笑脸始终朝向用户 (竖屏正向)
        // 如果当前角度是 90 或 -90 (横屏)，则需要旋转画布 -90 或 +90 来补偿
        if (orientationAngle === 90) {
            return -90;   // 逆时针旋转90度
        } else if (orientationAngle === -90 || orientationAngle === 270) {
            return 90;    // 顺时针旋转90度
        }
        return 0;
    }
    
    // 更新几何参数（基于画布原始尺寸，不考虑旋转）
    function updateGeometry() {
        // 使用短边基准，保证图案在旋转后依然比例舒适
        const minSide = Math.min(canvasWidth, canvasHeight);
        eyeRadius = minSide * 0.075;
        const eyeXOffsetRatio = 0.2;
        eyeXOffset = minSide * eyeXOffsetRatio;
        // 眼睛垂直位置基于高度
        eyeYPos = canvasHeight * 0.42;
        
        // 嘴巴
        mouthBaseY = canvasHeight * 0.58;
        const mouthWidth = minSide * 0.32;
        mouthStartX = centerX - mouthWidth / 2;
        mouthEndX = centerX + mouthWidth / 2;
        mouthCtrlY = mouthBaseY + minSide * 0.04;
    }
    
    // 绘制笑脸（不考虑旋转变换，始终按“画布原始方向”画一个正向脸）
    function drawFaceRaw(now) {
        if (!ctx) {return;}
        
        // 清空背景为黑色
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 眼睛部分
        if (!isBlinking) {
            // 左眼白
            ctx.beginPath();
            ctx.arc(centerX - eyeXOffset, eyeYPos, eyeRadius + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#AAAAAA';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // 右眼白
            ctx.beginPath();
            ctx.arc(centerX + eyeXOffset, eyeYPos, eyeRadius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 瞳孔
            ctx.fillStyle = '#2B1A0E';
            ctx.beginPath();
            ctx.arc(centerX - eyeXOffset, eyeYPos, eyeRadius * 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeXOffset, eyeYPos, eyeRadius * 0.65, 0, Math.PI * 2);
            ctx.fill();
            
            // 高光
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX - eyeXOffset - 3, eyeYPos - 2.5, eyeRadius * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeXOffset - 3, eyeYPos - 2.5, eyeRadius * 0.28, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 眨眼
            ctx.beginPath();
            ctx.ellipse(centerX - eyeXOffset, eyeYPos + 1.5, eyeRadius + 1, eyeRadius * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#CFAB7A';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(centerX + eyeXOffset, eyeYPos + 1.5, eyeRadius + 1, eyeRadius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 嘴巴
        ctx.beginPath();
        ctx.moveTo(mouthStartX, mouthBaseY);
        ctx.quadraticCurveTo(centerX, mouthCtrlY, mouthEndX, mouthBaseY);
        ctx.strokeStyle = '#EA8C3E';
        ctx.lineWidth = Math.max(3, Math.min(7, eyeRadius * 0.55));
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    
    // 绘制最终画面（如果全屏且需要旋转，则进行旋转变换）
    function drawFrame(now) {
        if (!ctx) {return;}
        
        // 保存状态
        ctx.save();
        
        // 根据全屏模式和屏幕方向决定是否旋转绘图上下文
        // 注意：即使不全屏，也应当根据屏幕方向旋转，以保证 video 全屏时正确
        // 我们检测当前实际屏幕方向来决定旋转
        const rotation = getRotationAngle();
        if (rotation !== 0) {
            // 需要旋转画布
            // 旋转中心为画布中心，旋转后使得原始绘制的脸朝向正确
            ctx.translate(canvasWidth / 2, canvasHeight / 2);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        }
        
        // 绘制正向脸
        drawFaceRaw(now);
        
        ctx.restore();
        
        // 可选：在右上角添加一个小提示（显示旋转角度），调试用，正式版不需要
        // ctx.fillStyle = 'white'; ctx.font = '12px monospace'; ctx.fillText(`rot:${rotation}`, 10, 30);
    }
    
    // 调整画布尺寸（匹配窗口实际像素）
    function resizeCanvas() {
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        canvas.width = winWidth;
        canvas.height = winHeight;
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        centerX = canvasWidth / 2;
        centerY = canvasHeight / 2;
        updateGeometry();
        
        // 更新提示文字
        const angle = getRotationAngle();
        //document.getElementById('infoTip').innerHTML = `👁️ 随机眨眼 | 方向修正: ${angle}°`;
    }
    
    // 监听全屏变化 (视频全屏时同样需要正确的旋转)
    function handleFullscreenChange() {
        isFullscreen = !!(document.fullscreenElement || document["webkitFullscreenElement"]);
        // 全屏变化后，可能屏幕方向也变了，强制重新调整
        resizeCanvas();
        const now = performance.now();
        isBlinking = false;
        scheduleNextBlink(now);
        drawFrame(now);
    }
    
    // 监听屏幕方向变化
    function handleOrientationChange() {
        resizeCanvas();
        const now = performance.now();
        isBlinking = false;
        scheduleNextBlink(now);
        drawFrame(now);
    }
    
    // 动画循环
    let animationId = null;
    let isPageVisible = true;
    
    function animate(timestamp) {
        if (!isPageVisible) {
            animationId = requestAnimationFrame(animate);
            return;
        }
        const now = performance.now();
        updateBlinkState(now);
        drawFrame(now);
        animationId = requestAnimationFrame(animate);
    }
    
    function handleVisibilityChange() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            const now = performance.now();
            isBlinking = false;
            scheduleNextBlink(now);
            drawFrame(now);
        }
    }
    
    // 初始化视频流
    let mediaStream = null;
    function initVideoStream() {
        if (typeof canvas.captureStream !== 'function') {
            console.warn("不支持 captureStream");
            return;
        }
        try {
            mediaStream = canvas.captureStream(15);
        } catch(e) {
            mediaStream = canvas.captureStream();
        }
        if (mediaStream) {
            video.srcObject = mediaStream;
            video.play().catch(e => console.log("autoPlay failed", e));
        }
    }
    
    // 启动
    function start() {
        resizeCanvas();
        const now = performance.now();
        scheduleNextBlink(now);
        drawFrame(now);
        animationId = requestAnimationFrame(animate);
        initVideoStream();
        
        window.addEventListener('resize', () => {
            resizeCanvas();
            const now = performance.now();
            isBlinking = false;
            scheduleNextBlink(now);
            drawFrame(now);
        });
        window.addEventListener('orientationchange', () => setTimeout(handleOrientationChange, 30));
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        // 监听视频元素的全屏请求（用户点击video全屏时也会触发）
        video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
        video.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }
    function stop(){
        if (animationId) {cancelAnimationFrame(animationId);}
        if (mediaStream) {mediaStream.getTracks().forEach(t => t.stop());}
        canvas.remove();
    }
    
    window.addEventListener('beforeunload', () => {
        stop();
    });
    
    start();
    return stop;
};