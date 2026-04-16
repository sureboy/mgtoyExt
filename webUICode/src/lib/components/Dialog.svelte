<!-- Dialog.svelte -->
 <script lang="ts" module>
 export type dialogStruct =  {
    dialogEl?:HTMLDialogElement,
    title:string,
    closeOnBackdrop:boolean,
    closeOnEsc:boolean,
    //children?:any
}
 
 </script>
<script lang="ts">
  import { onMount } from 'svelte';
  const {dialogConfig,children}:{dialogConfig:dialogStruct,children?:any} = $props()

    function closeModal() {
        //config.open = false;
        if (dialogConfig.dialogEl) dialogConfig.dialogEl.close();
    }

 

    // 点击遮罩关闭
    function handleBackdropClick(e:any) {
        if (dialogConfig.closeOnBackdrop && e.target === dialogConfig.dialogEl) {
            closeModal();
        }
    }

 

    // 监听键盘 ESC（确保状态同步）
    function handleKeyDown(e:any) {
        if (dialogConfig.closeOnEsc && e.key === 'Escape'  ) {
            closeModal();
        }
    }

    onMount(() => {
        //if (config.open) dialogEl?.showModal();
        //else dialogEl.close();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });
</script>

<dialog   bind:this={dialogConfig.dialogEl} onclick={handleBackdropClick}  >
    <div class="dialog-card">
        {#if dialogConfig.title}
            <h3 class="dialog-title">{dialogConfig.title}</h3>
        {/if}
        <div class="dialog-content">
            {#if children}
                {@render children()}
            {:else}
  
           
                <!-- 默认内容：一段文字 + 超链接 -->
                <p><a href="https://www.example.com" target="_blank" rel="noopener noreferrer"> 这是一个简洁弹出框，支持超链接。</a></p>
                <a href="https://www.example.com" target="_blank" rel="noopener noreferrer">访问示例网站 ↗</a>
         
              {/if}
        </div>
        <div class="dialog-actions">
            <button onclick={closeModal} class="dialog-btn">关闭</button>
        </div>
    </div>
</dialog>

<style>
    dialog {
        border: none;
        border-radius: 28px;
        padding: 0;
        background: transparent;
        max-width: 420px;
        width: 90%;
        animation: fadeIn 0.2s ease-out;
    }

    dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(3px);
    }

    .dialog-card {
        background: white;
        border-radius: 28px;
        padding: 1.8rem;
        text-align: center;
        box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
    }

    .dialog-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e2a3e;
    }

    .dialog-content {
        margin: 1rem 0;
        color: #2c3e44;
        line-height: 1.5;
    }
.dialog-content p a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eef2ff;
        padding: 6px 16px;
        border-radius: 60px;
        text-decoration: none;
        color: #1e4a76;
        font-weight: 500;
        margin-top: 0.5rem;
        transition: background 0.2s;
    }

    .dialog-content p a:hover {
        background: #e0e8ff;
        text-decoration: underline;
    }
    .dialog-content a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #eef2ff;
        padding: 6px 16px;
        border-radius: 60px;
        text-decoration: none;
        color: #1e4a76;
        font-weight: 500;
        margin-top: 0.5rem;
        transition: background 0.2s;
    }

    .dialog-content a:hover {
        background: #e0e8ff;
        text-decoration: underline;
    }

    .dialog-actions {
        margin-top: 1.2rem;
    }

    .dialog-btn {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 6px 20px;
        border-radius: 40px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .dialog-btn:hover {
        background: #e2e8f0;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.96);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>