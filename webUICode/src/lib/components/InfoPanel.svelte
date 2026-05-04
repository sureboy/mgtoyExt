<script lang="ts"  >
import { onMount } from "svelte";
import SuggestInput,{getInputValue} from "./SuggestInput.svelte";
const Link = {
    show:true,
    onclick:()=>{
        //const value = getInputValue()

        alert(getInputValue())
    }
};
//let datalist:HTMLDataListElement
const defaultUrl = "http://192.168.1.8:3000/conn.html"
const options = [defaultUrl,"test2","test3","test1"];
onMount(()=>{
    //init()
})
let info=false
</script>

<div class="info-panel">
    {#if info}
    <div class="code-section">
        <span class="code-label">方向码</span>
        <span class="code-value" id="directionCode">0</span>
        <div class="direction-hint">
            <span class="hint-item">↑1</span> <span class="hint-item">↗2</span> <span class="hint-item">→3</span>
            <span class="hint-item">↘4</span> <span class="hint-item">↓5</span> <span class="hint-item">↙6</span>
            <span class="hint-item">←7</span> <span class="hint-item">↖8</span> <span class="hint-item">●0</span>
        </div>
    </div>
    {/if}
    {#if Link.show}
    <div class="command-area">
        <SuggestInput {options}></SuggestInput>
        <button  id="sendBtn" onclick={Link.onclick} class="send-btn">确定</button>
    </div>
    {/if}
</div>

<style>
/* 信息面板 - 半透明玻璃效果，并且可以点击交互 */
.info-panel {
    position: fixed;
    top: 24px;
    left: 24px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(12px);
    border-radius: 48px;
    padding: 12px 24px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 100;
    pointer-events: auto;      /* 允许面板内元素交互（输入框、按钮） */
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    color: white;
}

.code-section {
    display: flex;
    align-items: baseline;
    gap: 12px;
    background: rgba(0, 0, 0, 0.4);
    padding-right: 16px;
    border-radius: 40px;
}

.code-label {
    font-size: 14px;
    letter-spacing: 1px;
    color: #ccdeff;
    text-transform: uppercase;
}

.code-value {
    font-size: 52px;
    font-weight: 800;
    font-family: 'Monaco', 'Menlo', monospace;
    color: #ffffff;
    text-shadow: 0 2px 12px #00aaff80;
    line-height: 1;
    min-width: 70px;
    text-align: center;
}

.direction-hint {
    font-size: 13px;
    color: #eef4ff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 40px;
    padding: 5px 14px;
    display: inline-flex;
    gap: 8px;
    backdrop-filter: blur(4px);
}

.hint-item {
    font-family: monospace;
    font-weight: bold;
}

/* 输入框和按钮样式 */
.command-area {
    display: flex;
    gap: 10px;
    align-items: center; 
    backdrop-filter: blur(4px);
}
 

.send-btn {
    background: rgba(80, 140, 200, 0.85);
    border: none;
    border-radius: 40px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: 0.2s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.send-btn:active {
    transform: scale(0.96);
    background: #3b82f6;
}
 @media (max-width: 700px) {
    .info-panel {
        top: 16px;
        left: 16px;
        right: 16px;
        flex-direction: column;
        align-items: stretch;
        border-radius: 32px;
        gap: 12px;
    }
    .code-section {
        justify-content: space-between;
    }
    .command-area {
        justify-content: space-between;
    }
 
    .code-value {
        font-size: 40px;
        min-width: 55px;
    }
}
</style>