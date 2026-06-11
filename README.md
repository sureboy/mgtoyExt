# mgtoy – HTML Preview Plus


> 🚀 **mgtoy** 是一个集代码学习、UI 设计演示与数据交换中介于一体的 VS Code 插件。  
> 在编辑器中实时预览 HTML，内置 HTTP 服务器、动态 UDP 服务，并通过 WebRTC 将页面同步至 [https://mgtoy.cn](https://mgtoy.cn) —— 一个专注于项目代码逻辑与 UI 设计学习的平台，同时作为本地与远程端之间的数据交换枢纽。

## 📖 目录

- [mgtoy – HTML Preview Plus](#mgtoy--html-preview-plus)
  - [📖 目录](#-目录)
  - [🧠 核心概念](#-核心概念)
  - [✨ 功能特性](#-功能特性)
  - [🚀 快速开始](#-快速开始)
  - [📚 详细用法](#-详细用法)
    - [HTTP 服务器与 Webview 预览](#http-服务器与-webview-预览)
    - [UDP 服务 (通过 postMessage 启动)](#udp-服务-通过-postmessage-启动)
    - [WebRTC 远程同步 → mgtoy 平台](#webrtc-远程同步--mgtoy-平台)
    - [扩展更多服务](#扩展更多服务)
  - [⚙️ 配置选项](#️-配置选项)
  - [📡 API 参考](#-api-参考)
    - [Webview → 插件（通过 `vscode.postMessage`）](#webview--插件通过-vscodepostmessage)
    - [插件 → Webview（通过 `window.addEventListener('message')`）](#插件--webview通过-windowaddeventlistenermessage)
  - [❓ 常见问题](#-常见问题)
  - [⚠️ 已知限制](#️-已知限制)
  - [🤝 贡献指南](#-贡献指南)
  - [📄 许可证](#-许可证)

## 🧠 核心概念

**mgtoy** 由两部分构成：

1. **VS Code 插件** – 提供本地开发环境中的 HTML 预览、HTTP/UDP 服务、WebRTC 信令客户端。  
2. **云端平台 [mgtoy.cn](https://mgtoy.cn)** – 一个专门用于**项目代码逻辑演示**与**UI 设计学习**的网站，同时也是**本地与任何远程端之间的数据交换中介**。

当插件与 mgtoy.cn 建立 WebRTC 连接后：
- 远程端（例如另一台电脑的浏览器）可以实时看到本地 HTML 的完整界面与交互。
- 远程端可以调用需要 **HTTPS 安全上下文**的 Web API（如 `getUserMedia`、WebUSB、WebBluetooth），并将结果回传给本地插件。
- mgtoy.cn 本身不存储任何用户数据，仅作为信令交换与中转节点，保护隐私。

## ✨ 功能特性

- **本地预览**：在 VS Code Webview 中渲染 HTML，支持完整的现代浏览器特性。
- **内置 HTTP 服务器**：快速提供静态资源服务，避免跨域问题。
- **动态 UDP 服务**：在 HTML 中通过 `postMessage` 动态启动/停止 UDP 服务，与外部 UDP 客户端进行数据交互。
- **可扩展服务架构**：未来将支持 TCP、串口等其他服务（通过相同的消息协议扩展）。
- **WebRTC 远程同步 → mgtoy 平台**：
  - 通过 `https://zaddone.com` 信令交换服务器建立连接。
  - 将本地预览的 HTML 内容实时同步至 **mgtoy.cn**，用于代码逻辑讲解、UI 设计评审或远程调试。
  - 远程页面运行在真实的 HTTPS 环境中，可调用受安全上下文约束的 Web API。
- **数据交换中介**：mgtoy.cn 可在多个客户端之间转发消息，实现本地 ↔ 云端 ↔ 其他设备的双向数据通道。

## 🚀 快速开始

1. 在 VS Code 扩展市场搜索 `mgtoy` 并安装。
2. 打开一个 HTML 文件，右键选择 **"mgtoy: 预览"**。
3. 插件将自动启动 HTTP 服务器并在侧边 Webview 中显示页面。
4. 在 HTML 中编写脚本，通过 `postMessage` 启动 UDP 服务或建立 WebRTC 连接。
5. 访问 [https://mgtoy.cn](https://mgtoy.cn)，输入插件生成的配对码，即可在云端查看并交互本地页面。

## 📚 详细用法

### HTTP 服务器与 Webview 预览

- 默认情况下，服务器以当前打开文件所在的目录为根目录，端口为 `3000`（可在设置中修改）。
- 支持动态刷新：保存 HTML 文件时 Webview 会自动重新加载。
- 预览区域支持开发者工具（右键菜单 → “检查元素”）。

### UDP 服务 (通过 postMessage 启动)

在您的 HTML 文件中，通过向 `acquireVsCodeApi().postMessage()` 发送特定格式的消息来启动 UDP 服务。

```html
<script>
  const vscode = acquireVsCodeApi();

  // 启动 UDP 服务，监听 9002 端口
  vscode.postMessage({
    start: {
      udp: {
        port: 9002
      }
    }
  });

  // 监听来自 UDP 客户端的消息
  window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    if (type === 'udpMessage') {
      console.log('收到 UDP 消息:', data);
      // 处理收到的数据，例如更新页面内容
    }
  });

  // 可选：停止 UDP 服务
  // vscode.postMessage({ stop: { udp: { port: 9002 } } });
</script>
```

当 UDP 服务启动后，您可以使用任何 UDP 客户端（如 `nc -u localhost 9002`）向其发送数据，插件会将消息通过 `message` 事件传递给 Webview。  
若要从 Webview 向外发送 UDP 数据，可使用：

```javascript
vscode.postMessage({
  udpSend: {
    port: 9002,
    address: '192.168.1.100', // 目标 IP
    message: 'Hello from Webview'
  }
});
```

### WebRTC 远程同步 → mgtoy 平台

通过 WebRTC 将当前预览页面同步至 **mgtoy.cn**。该平台不仅展示您的页面，还作为数据交换中介，允许远程客户端（如另一台电脑的浏览器、手机）与本地插件互相收发消息。

**使用方法：**

1. 在预览页面的 HTML 中添加如下脚本（或通过插件命令自动注入）：
   ```javascript
   const vscode = acquireVsCodeApi();
   
   // 建立 WebRTC 连接
   vscode.postMessage({
     webrtc: {
       action: 'connect',
       signalingServer: 'https://zaddone.com/rtc',
       remoteSite: 'https://mgtoy.cn'
     }
   });

   // 监听同步状态
   window.addEventListener('message', (event) => {
     if (event.data.type === 'webrtcStatus') {
       console.log('连接状态:', event.data.status); // 'connecting', 'connected', 'error'
       if (event.data.code) {
         // 显示配对码，用于在 mgtoy.cn 上输入
         alert(`请在 ${event.data.remoteSite} 输入配对码: ${event.data.code}`);
       }
     }
     
     // 接收来自远程页面或其他客户端的数据（通过 mgtoy 中介转发）
     if (event.data.type === 'remoteMessage') {
       console.log('收到远程消息:', event.data.payload);
       // 可以在此调用本地 UDP 服务或更新 UI
     }
   });
   ```

2. 打开浏览器访问 `https://mgtoy.cn`，根据提示输入配对码。  
   - 配对成功后，远程页面会实时镜像本地 HTML 内容。  
   - **作为学习平台**：您可以在 mgtoy.cn 上查看代码逻辑的执行过程、UI 布局细节，并与团队成员分享链接。  
   - **作为数据交换中介**：任何连接到同一配对会话的客户端（包括 mgtoy.cn 页面本身、其他浏览器窗口、手机端等）都可以通过 WebRTC DataChannel 发送消息，插件会将这些消息以 `remoteMessage` 事件推送给本地 Webview。

3. 远程页面运行在真实的 HTTPS 环境中，因此可以正常调用 `navigator.mediaDevices.getUserMedia`、`navigator.bluetooth.requestDevice` 等通常需要 HTTPS 的 API。例如，您可以在远程页面上访问摄像头，然后将视频流数据通过 DataChannel 发送回本地插件，供本地 UDP 服务转发给其他设备。

**同步机制说明：**
- 初始同步：完整 HTML 字符串（包括 `<head>` 和 `<body>`）。
- 增量同步：DOM 变更、用户输入、滚动位置等（基于 MutationObserver 和事件转发）。
- 数据交换：通过 `postMessage` 和 DataChannel 实现双向、低延迟的消息传递。

### 扩展更多服务

插件设计支持未来的服务扩展。您可以通过相同的消息格式启动其他协议的服务，例如 TCP：

```javascript
// 未来将支持的语法示例
vscode.postMessage({
  start: {
    tcp: {
      port: 9003,
      mode: 'server'
    }
  }
});
```

插件会忽略当前不支持的服务类型，并在控制台输出提醒。

## ⚙️ 配置选项

在 VS Code 设置中搜索 `mgtoy` 可调整以下选项：

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `server.port` | number | `3000` | HTTP 服务器端口 |
| `server.root` | string | 工作区根目录 | 静态文件服务根路径 |
| `udp.autoReconnect` | boolean | `false` | UDP 服务是否在异常断开后自动重启 |
| `webrtc.signalingServer` | string | `"https://zaddone.com/rtc"` | 默认信令服务器地址 |
| `webrtc.remoteSite` | string | `"https://mgtoy.cn"` | 默认远程同步网站（数据交换中介） |
| `webview.enableDevTools` | boolean | `true` | 是否允许在 Webview 中打开开发者工具 |

## 📡 API 参考

### Webview → 插件（通过 `vscode.postMessage`）

| 消息格式 | 描述 |
|---------|------|
| `{ start: { udp: { port } } }` | 在指定端口启动 UDP 服务器 |
| `{ stop: { udp: { port } } }` | 停止指定端口的 UDP 服务 |
| `{ udpSend: { port, address, message } }` | 通过已启动的 UDP 服务向目标发送数据 |
| `{ webrtc: { action, signalingServer, remoteSite } }` | 建立或关闭 WebRTC 连接（action: `connect`/`disconnect`） |
| `{ sendToRemote: { payload } }` | 向远程端（mgtoy 中介）发送任意数据 |
| `{ syncDom: { html, selector } }` | 手动触发 DOM 同步（高级用法） |

### 插件 → Webview（通过 `window.addEventListener('message')`）

| 事件类型 (`data.type`) | 数据示例 | 描述 |
|------------------------|----------|------|
| `udpMessage` | `{ data: "Buffer or string" }` | 收到 UDP 客户端发来的消息 |
| `webrtcStatus` | `{ status, code, remoteSite }` | WebRTC 连接状态及配对码 |
| `remoteMessage` | `{ payload }` | 从 mgtoy 中介（或其他远程客户端）收到的消息 |
| `serverStarted` | `{ port, type: "http" \| "udp" }` | 服务已启动的通知 |

## ❓ 常见问题

**Q: mgtoy.cn 会保存我的页面内容或数据吗？**  
A: 不会。mgtoy.cn 仅作为实时信令交换与数据中转，所有页面内容和消息均不落盘，连接关闭后立即清除。

**Q: 启动 UDP 服务后，提示端口已被占用？**  
A: 请检查是否有其他进程占用了该端口，或修改 `udp.port` 配置。

**Q: WebRTC 连接一直停留在 "connecting" 状态？**  
A: 请确保网络可以访问 `zaddone.com` 和 `mgtoy.cn`。某些企业网络可能限制 WebSocket 或 UDP（用于 ICE）。可以尝试配置代理或使用公共网络。

**Q: 远程页面是否能完全模拟本地交互？**  
A: 鼠标、键盘事件会被同步，但部分依赖于本地文件系统或 Node.js 的功能无法在远程生效（例如读取本地文件）。远程页面只能调用标准 Web API。

**Q: 同步的 HTML 中包含了内联脚本，远程页面会执行吗？**  
A: 会执行。出于安全考虑，建议不要在同步内容中包含敏感逻辑。远程页面运行在 `https://mgtoy.cn` 域下，请遵守该网站的使用条款。

**Q: 如何将 mgtoy 用作团队协作的代码/UI 评审工具？**  
A: 开发者本地预览页面后，将配对码发给评审者。评审者访问 mgtoy.cn 输入配对码，即可实时看到本地页面，并可进行标注或发送消息回传给开发者。

## ⚠️ 已知限制

- UDP 服务目前仅支持 IPv4 和基础数据报收发，不支持广播或多播。
- 同时启动多个 UDP 服务需要不同的端口。
- WebRTC 同步时，远程页面无法访问 `localStorage` 或 `IndexedDB` 中本地保存的数据。
- 如果 HTML 体积过大（超过 1MB），初始同步可能会略有延迟。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request。开发环境准备：

```bash
git clone https://github.com/your-repo/mgtoy.git
cd mgtoy
npm install
npm run watch
```

在 VS Code 中按 `F5` 启动调试。

## 📄 许可证

MIT © [Your Name](https://github.com/your-repo)
