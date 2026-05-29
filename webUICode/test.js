
 


let clickEvent =window.parent?window.parent.postMessage:console.log;
const canvas  = document.getElementById("joystickCanvas");
let stickOuterRadius = 110;      // 大圈半径 (底座)
let stickInnerRadius = 34;       // 小手柄半径
let maxMoveDist = stickOuterRadius - stickInnerRadius; // 76px

// 右下角边距 (动态适应屏幕)
let marginRight = 32;
let marginBottom = 32;

let centerX = 0, centerY = 0;    // 摇杆圆心坐标 (动态)

// 状态变量
let dragging = false;
let offsetX = 0, offsetY = 0;     // 手柄偏移量
let currentDirection = 0;          // 0停止, 1~8八方向

let stopThreshold = maxMoveDist * 0.2;  // 停止阈值 ≈15.2px
// ---------- 辅助: 获取方向码 (从偏移量) ----------
function computeDirection(dx, dy) {
    const dist = Math.hypot(dx, dy);
    if (dist < stopThreshold) {return 0;}
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) {angle += 360;}
    // 8方向扇区 (边界偏移22.5°)
    if ((angle >= 337.5 && angle <= 360) || (angle >= 0 && angle < 22.5)) {return 1; }  // 上
    if (angle >= 22.5 && angle < 67.5) {return 2;}    // 右上
    if (angle >= 67.5 && angle < 112.5) {return 3;}   // 右
    if (angle >= 112.5 && angle < 157.5) {return 4;}  // 右下
    if (angle >= 157.5 && angle < 202.5) {return 5;}  // 下
    if (angle >= 202.5 && angle < 247.5) {return 6;}  // 左下
    if (angle >= 247.5 && angle < 292.5) {return 7;}  // 左
    if (angle >= 292.5 && angle < 337.5) {return 8; } // 左上
    return 0;
}
// 更新UI方向码显示
function updateDirectionUI() {
    const newDir = computeDirection(offsetX, offsetY);
    if (currentDirection !== newDir) {
        currentDirection = newDir;
        //directionSpan(currentDirection);
    }// else {
        clickEvent({msg:currentDirection});
    //}
}
// 重置摇杆至中心 (停止)
function resetStick() {
    offsetX = 0;
    offsetY = 0;
    dragging = false;
    updateDirectionUI();
    drawJoystickOnly();
}
// ----- 窗口自适应 & 摇杆重新定位 -----
function resizeCanvasAndUpdate() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    //canvas.transferControlToOffscreen()
    updateStickCenter();
    resetStick();
    drawJoystickOnly();
}
function adjustMarginsForScreen() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 450 || h < 550) {
        marginRight = Math.min(18, w * 0.05);
        marginBottom = Math.min(18, h * 0.05);
    } else {
        marginRight = 32;
        marginBottom = 32;
    }
    maxMoveDist = stickOuterRadius - stickInnerRadius;
    stopThreshold = maxMoveDist * 0.2;
    updateStickCenter();
}
    // 更新摇杆圆心位置 (根据窗口尺寸)
function updateStickCenter() {
    const w = canvas.width;
    const h = canvas.height;
    centerX = w - marginRight - stickOuterRadius;
    centerY = h - marginBottom - stickOuterRadius;
    // 边界保护，确保圆心不超出画布边缘
    centerX = Math.min(Math.max(centerX, stickOuterRadius), w - stickOuterRadius);
    centerY = Math.min(Math.max(centerY, stickOuterRadius), h - stickOuterRadius);
}
function isInsideStickArea(px, py) {
    const dx = px - centerX;
    const dy = py - centerY;
    return Math.hypot(dx, dy) <= stickOuterRadius + 15;
}
// ----- 交互事件 (鼠标 + 触摸) -----
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
        if (e.touches.length === 0){ return null;}
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    let canvasX = (clientX - rect.left) * scaleX;
    let canvasY = (clientY - rect.top) * scaleY;
    canvasX = Math.min(Math.max(0, canvasX), canvas.width);
    canvasY = Math.min(Math.max(0, canvasY), canvas.height);
    return { x: canvasX, y: canvasY };
}
// 限制偏移量并更新方向
function setOffset(rawDx, rawDy) {
    let dist = Math.hypot(rawDx, rawDy);
    if (dist > maxMoveDist) {
        rawDx = rawDx / dist * maxMoveDist;
        rawDy = rawDy / dist * maxMoveDist;
    }
    offsetX = rawDx;
    offsetY = rawDy;
    updateDirectionUI();
    drawJoystickOnly(); // 实时重绘摇杆控件
}
function startDrag(e) {
    e.preventDefault();
    const coord = getCanvasCoords(e);
    if (!coord) {return;}
    if (!isInsideStickArea(coord.x, coord.y)) {return;}
    dragging = true;
    let dx = coord.x - centerX;
    let dy = coord.y - centerY;
    setOffset(dx, dy);
}
function onDragMove(e) {
    if (!dragging){ return;}
    e.preventDefault();
    const coord = getCanvasCoords(e);
    if (!coord){ return;}
    let dx = coord.x - centerX;
    let dy = coord.y - centerY;
    setOffset(dx, dy);
}

function endDrag(e) {
    if (!dragging) {
        if (offsetX !== 0 || offsetY !== 0) {resetStick();}
        return;
    }
    dragging = false;
    resetStick();
}   // ----- 事件绑定 -----
function bindEvents() {
    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', endDrag);
    
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    canvas.addEventListener('touchmove', onDragMove, { passive: false });
    canvas.addEventListener('touchend', endDrag);
    canvas.addEventListener('touchcancel', endDrag);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
function handleResize() {
    adjustMarginsForScreen();
    resizeCanvasAndUpdate();
}
function init() {
    adjustMarginsForScreen();
    resizeCanvasAndUpdate();
    bindEvents();
    //initCamera();
    window.addEventListener('resize', handleResize);
    // 每帧重绘摇杆（确保视频尺寸变化时摇杆位置与画布同步，频繁重绘开销极小）
    function animationLoop() {
        drawJoystickOnly();
        requestAnimationFrame(animationLoop);
    }
    animationLoop();
}
function drawJoystickOnly() {
    if (!canvas){ return;}
    const ctx = canvas.getContext('2d');
    // 清除整个canvas (透明背景)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制半透明摇杆底座 (大圈)
    ctx.save();
    ctx.globalAlpha = 0.88;      // 整体半透明，让底部视频透出
    
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // 大圈底座
    ctx.beginPath();
    ctx.arc(centerX, centerY, stickOuterRadius, 0, Math.PI * 2);
    const gradOuter = ctx.createLinearGradient(centerX - 30, centerY - 30, centerX + 30, centerY + 30);
    gradOuter.addColorStop(0, "rgba(35, 55, 72, 0.8)");
    gradOuter.addColorStop(1, "rgba(18, 35, 48, 0.9)");
    ctx.fillStyle = gradOuter;
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 225, 250, 0.65)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    
    // 内圈细线 (无刻度)
    ctx.beginPath();
    ctx.arc(centerX, centerY, stickOuterRadius - 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(160, 200, 240, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    
    // 小手柄 (根据偏移量)
    const knobX = centerX + offsetX;
    const knobY = centerY + offsetY;
    const gradKnob = ctx.createRadialGradient(knobX - 8, knobY - 8, 5, knobX, knobY, stickInnerRadius);
    gradKnob.addColorStop(0, "rgba(250, 255, 255, 0.95)");
    gradKnob.addColorStop(0.6, "rgba(190, 220, 250, 0.85)");
    gradKnob.addColorStop(1, "rgba(110, 150, 190, 0.8)");
    ctx.beginPath();
    ctx.arc(knobX, knobY, stickInnerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradKnob;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 245, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 高光点
    ctx.beginPath();
    ctx.arc(knobX - 7, knobY - 7, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 250, 0.7)";
    ctx.fill();
    
    // 底座中心小圆点 (视觉定位)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 220, 255, 0.6)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fill();
    
    // 拖拽时高亮光环
    if (dragging) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, stickOuterRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(140, 210, 255, 0.85)";
        ctx.lineWidth = 2.2;
        ctx.shadowBlur = 12;
        ctx.stroke();
    }
    
    // 可选: 极简的八个微弱方向指示点 (无文字，仅增强视觉)
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 8; i++) {
        let angleRad = (i * 45) * Math.PI / 180;
        let rad = stickOuterRadius - 12;
        let xTip = centerX + rad * Math.cos(angleRad);
        let yTip = centerY + rad * Math.sin(angleRad);
        ctx.beginPath();
        ctx.arc(xTip, yTip, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
    }
    ctx.restore();  // 恢复 globalAlpha
}
init();