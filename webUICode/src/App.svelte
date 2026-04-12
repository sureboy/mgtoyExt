<script lang="ts">
  import Control  from "./lib/Control.svelte"   
  
  import ControlExt from "./lib/ControlExt.svelte"
  </script>
  <svelte:head>
  <script>
      const globalEvent=[]
      document.addEventListener('DOMContentLoaded', ()=>{
      for (let func of globalEvent) func()      
      })
     
  </script>
  <script src={`./page.js?v=${Date.now()}`} defer  ></script>
  </svelte:head> 
  
  <div class="tab-container">
      <div class="tab-header" id="groupCar">
          <a href="#mgtoys" id="mgtoys" class="tab-button active"  >+</a>
   
      </div>
      
      <div class="tab-content" id="tab_content">
          <div   class="tab-pane active">
              <div class="form-group"> 
                  <input type="text" id="code"  maxlength="6" placeholder="Input Code">
              </div>
 
          </div>
          
          <div   class="tab-pane"  >
              <div class="remote-control">
       
                  <div class="control-panel" >
                    <div class="speed-control">
                      <ControlExt />
                    </div>
                    <Control />
                  </div>
                 
                </div>
          </div>     
      </div>
  </div>
  <style>
      /* 基础样式 */
  * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Arial', sans-serif;
  }
   
  .remote-control {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
   
      } 
      .control-panel {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
      
      }
       
      
      .speed-control {
        flex: 1;
        min-width: 250px;
        padding: 20px;
   
      }
  /* 标签容器 */
  .tab-container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
  }
  
  /* 标签头部 */
  .tab-header {
      display: flex;
      background: #f1f1f1;
      border-bottom: 1px solid #ddd;
      overflow-x: auto; /* 小屏幕时可横向滚动 */
      scrollbar-width: none; /* 隐藏滚动条 */
  }
  
  .tab-header::-webkit-scrollbar {
      display: none; /* Chrome/Safari隐藏滚动条 */
  }
  
  .tab-button {
      padding: 12px 20px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: #555;
      white-space: nowrap; /* 防止文字换行 */
      transition: all 0.3s ease;
      position: relative;
      text-decoration: none;
  }
  
  .tab-button:hover {
      background: #e0e0e0;
  }
  
  .tab-button.active {
      color: #2196F3;
      background: white;
  }
  
  .tab-button.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: #2196F3;
  }
  
  /* 标签内容 */
  .tab-content {
      padding: 20px;
  }
  
  .tab-pane {
     /* display: none; */
  }
  
  .tab-pane.active {
      display: block;
      animation: fadeIn 0.5s ease;
  }
  
  @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
  }
   
  
  .form-group {
      margin-bottom: 15px;
  }
   
  
  .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
  }
   
  /* 响应式设计 */
  @media (max-width: 768px) {
      .tab-button {
          padding: 10px 15px;
          font-size: 14px;
      }
      
     
  }
  
  @media (max-width: 480px) {
      .tab-header {
          flex-wrap: wrap;
      }
      
      .tab-button {
          flex: 1 0 50%;
          text-align: center;
      }
     
  }
  </style>