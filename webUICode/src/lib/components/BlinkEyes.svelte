<script>
  // 用 Svelte 响应式变量控制额外眨眼（点击时触发）
  let triggerBlink = false;

  // 触发临时眨眼：添加 .blink-now 类，随后移除
  function handleClick() {
    triggerBlink = true;
    // 150ms 后移除，确保动画完整执行一次
    setTimeout(() => {
      triggerBlink = false;
    }, 200);
  }
</script>

<style>
  /* 全局样式 – 组件内 scoped 不影响外部（如果希望全局黑背景，建议在外层容器设置，或使用 :global） */
  .blink-container {
    background: #000000;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font-family: system-ui, 'Segoe UI', monospace;
  }

  .eyes {
    display: flex;
    gap: 3rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    padding: 1rem;
  }

  /* 单眼结构 */
  .eye {
    position: relative;
    width: 120px;
    height: 120px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
    cursor: pointer;  /* 提示可点击 */
    transition: transform 0.1s ease;
  }
  .eye:active {
    transform: scale(0.98);
  }

  /* 瞳孔 */
  .pupil {
    position: absolute;
    width: 44px;
    height: 44px;
    background: #0a0a0a;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
  }

  /* 高光点 */
  .highlight {
    position: absolute;
    width: 12px;
    height: 12px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    top: 32%;
    left: 62%;
    transform: translate(-50%, -50%);
    filter: blur(0.3px);
    pointer-events: none;
  }

  /* 眼睑（伪元素）– 默认动画为周期性眨眼 */
  .eye::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0%;
    background: #000000;
    border-radius: 50%;
    z-index: 10;
    pointer-events: none;
    /* 无限循环眨眼动画，3.8s 一次 */
    animation: blink 3.8s ease-in-out infinite;
  }

  /* 临时点击眨眼类：覆盖动画，立即执行一次快速闭眼 */
  .eye.blink-now::before {
    animation: none;           /* 取消原有循环动画 */
    height: 100%;
    transition: height 0.05s linear;
  }

  /* 基础眨眼关键帧 */
  @keyframes blink {
    0%, 90%, 100% {
      height: 0%;
    }
    93%, 97% {
      height: 100%;
    }
  }

  /* 响应式调整 */
  @media (max-width: 480px) {
    .eye {
      width: 90px;
      height: 90px;
    }
    .pupil {
      width: 32px;
      height: 32px;
    }
    .highlight {
      width: 9px;
      height: 9px;
      top: 30%;
      left: 63%;
    }
    .eyes {
      gap: 2rem;
    }
  }

  /* 提示信息 */
  .info {
    text-align: center;
    margin-top: 2rem;
    color: #888;
    font-size: 0.8rem;
    background: rgba(255,255,255,0.05);
    padding: 0.4rem 1rem;
    border-radius: 40px;
    backdrop-filter: blur(2px);
  }
  .info span {
    display: inline-block;
    margin-right: 4px;
  }
</style>

<div class="blink-container">
  <div class="eyes">
    <!-- 左眼：绑定点击事件和临时眨眼类 -->
    <div
      class="eye"
      class:blink-now={triggerBlink}
      onclick={handleClick}
    >
      <div class="pupil"></div>
      <div class="highlight"></div>
    </div>
    <!-- 右眼：同样支持点击眨眼 -->
    <div
      class="eye"
      class:blink-now={triggerBlink}
      onclick={handleClick}
    >
      <div class="pupil"></div>
      <div class="highlight"></div>
    </div>
  </div>
  <div class="info">
    <span>⚫</span> 眨眼动画 · Svelte 组件 <span>👁️</span>
    <span style="font-size:0.7rem;">（点击任意眼睛快速眨眼）</span>
  </div>
</div>