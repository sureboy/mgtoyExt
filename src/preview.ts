import * as vscode from 'vscode';
import * as path from 'path';
import {stopServer,startServer} from './init';
import {defaultSerConfig} from './http';
import { pool } from './webrtc';
let panel:vscode.WebviewPanel|null  = null;
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

const  setCSPMetaInHtml = (html:string, contentValue:string) => {
  // 匹配 <meta http-equiv="Content-Security-Policy" ... content="...">
  // 支持属性值使用单引号或双引号，属性间可能有任意空白
  const regex = /<meta\s+http-equiv=(["'])Content-Security-Policy\1\s+content=(["'])(.*?)\2\s*\/?>/i;
  
  const match = html.match(regex);
  
  if (match) {
    // 如果存在，替换 content 属性值
    // 需要构造新的标签字符串，保留原来的属性顺序和引号风格
    // 简单起见，我们可以用 replace 方法，将 content 的值替换为新值
    // 注意：如果 content 值本身包含引号等，简单的字符串替换可能不安全，但这里假设 content 是合法值
    const newTag = match[0].replace(/(content=)(["']).*?\2/, `$1$2${contentValue}$2`);
    return html.replace(regex, newTag);
  } else {
    // 不存在，在 </head> 前插入（假设有 <head>，如果无 head 则追加到开头或 body 前，这里简化为在头部插入）
    const metaTag = `<meta http-equiv="Content-Security-Policy" content="${contentValue}">`;
    // 尝试在 </head> 前插入，如果没有 head 则插入到 <html> 后或开头
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, metaTag + '</head>');
    } else {
      // 没有 head 标签，直接插入到开头（可能不是最佳位置，但简单处理）
      return metaTag + html;
    }
  }
};
const  setScriptNonce = (html: string, nonceValue: string): string => {
  // 正则匹配所有 script 开始标签（不包括闭合部分）
  // 捕获属性部分（不含 'script' 和 '>'）
  const scriptOpenTagRegex = /<script\b([^>]*?)>/gi;

  return html.replace(scriptOpenTagRegex, (match, attributes) => {
    // 处理属性字符串，检查是否存在 nonce 属性（不区分大小写）
    const noncePattern = /\bnonce\s*=\s*(["']?)([^"'\s>]*)\1?/i;
    const nonceMatch = attributes.match(noncePattern);

    if (nonceMatch) {
      // 情况1：nonce 属性已存在，替换其值（保留原有引号风格，统一改为双引号）
      const newAttributes = attributes.replace(
        noncePattern,
        `nonce="${nonceValue}"`
      );
      return `<script ${newAttributes}>`;
    } else {
      // 情况2：nonce 属性不存在，添加属性
      // 如果原属性字符串非空，需加空格分隔
      const trimmed = attributes.trim();
      const separator = trimmed ? ' ' : '';
      return `<script ${trimmed}${separator}nonce="${nonceValue}">`;
    }
  });
};
const  replaceAssetPathsAdvanced = (html: string, replacer: (originalPath: string) => string): string => {
  // 匹配 link 标签，捕获整个 href 属性值
  html = html.replace(/(<link\s+[^>]*\bhref=["'])([^"']+)(["'][^>]*>)/gi, 
    (match, prefix, oldPath, suffix) => prefix + replacer(oldPath) + suffix
  );

  // 匹配 script 标签，捕获整个 src 属性值
  html = html.replace(/(<script\s+[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, 
    (match, prefix, oldPath, suffix) => prefix + replacer(oldPath) + suffix
  );
 // 3. 处理内联 script 标签内的模块导入路径（仅当标签内容为 JavaScript 代码时）
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (fullMatch, attrs, scriptContent:string) => {
    // 如果标签有 src 属性，说明是外部脚本，跳过内容处理
    if (/\bsrc\s*=/i.test(attrs)) {
      return fullMatch;
    }

    // 解析 type 属性，判断是否为 JavaScript 代码
    let isJavaScript = false;
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']*)["']/i);
    if (!typeMatch) {
      // 没有 type 属性，默认为 JavaScript
      isJavaScript = true;
    } else {
      const typeValue = typeMatch[1].toLowerCase();
      // 常见的 JavaScript 类型：module, text/javascript, application/javascript 等
      if (typeValue === 'module' || typeValue === 'text/javascript' || typeValue === 'application/javascript') {
        isJavaScript = true;
      }
    }

    // 仅当是 JavaScript 代码时才替换 import/export/require 中的路径
    if (isJavaScript) { 
      return `<script${attrs}>${replaceAssetPathsFromJS(scriptContent,replacer)}</script>`;
    }

    // 非 JavaScript 的脚本块，直接返回原内容
    return fullMatch;
  });
  return html;
};
const replaceAssetPathsFromJS = (jsStr: string, replacer: (originalPath: string) => string)=>{
  return jsStr.replace(
        /(?:import\s*\(|import\s+.*\s+from\s+|export\s+.*\s+from\s+|require\s*\(\)?)\s*['"]([^'"]+)['"]/g,
        (match, oldPath) => match.replace(oldPath, replacer(oldPath))
      );
};
const insertScriptAtBodyStart = (html: string, codeToInsert: string)=> {
  const bodyRegex = /<body\b[^>]*>/i;
  const bodyMatch = html.match(bodyRegex);
  if (!bodyMatch) {return html;}

  const bodyOpenTag = bodyMatch[0];
  const newScript = `<script>${codeToInsert}</script>`;

  // 在 body 开始标签后立即插入新脚本
  const modifiedHtml = html.replace(bodyRegex, bodyOpenTag + newScript);
  return modifiedHtml;
};
const setWebviewHtml = (uri: vscode.Uri,context: vscode.ExtensionContext,port =3000)=>{
    const nonce = getNonce();
    //const port =3000;
	const csp = `default-src 'none';
    frame-src blob: data: 'nonce-${nonce}' ${panel?.webview.cspSource};
	script-src 'self' 'nonce-${nonce}' ${panel?.webview.cspSource} http://localhost:${port||3000} 'unsafe-eval' 'wasm-eval' 'strict-dynamic';
	script-src-elem 'self' 'nonce-${nonce}' ${panel?.webview.cspSource} 'strict-dynamic';
	worker-src ${panel?.webview.cspSource} http://localhost:${port||3000} 'unsafe-inline' blob: data:;
	style-src ${panel?.webview.cspSource} http://localhost:${port||3000} 'unsafe-inline';
	img-src   ${panel?.webview.cspSource} http://localhost:${port||3000}  blob: data:;
	connect-src ${panel?.webview.cspSource}  http://localhost:${port||3000}    'unsafe-inline';`;
	
    //const config = {name:"mgToy"};
    vscode.workspace.fs.readFile(uri).then(content=>{
        let strHtml = new TextDecoder('utf-8').decode(content) ;
        strHtml = setCSPMetaInHtml(strHtml,csp );
		strHtml = insertScriptAtBodyStart(strHtml,`window.vscode = acquireVsCodeApi();
function reportErrorToExtension(errorDetails) {
  if (window.vscode) {
    window.vscode.postMessage({
      type: 'webviewError',
      payload: errorDetails
    });
  } else {
    // 备用方案：回退到控制台输出
    console.error('[Fallback] Webview Error:', errorDetails);
  }
}
window.addEventListener('error', (event) => { 
  const errorInfo = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  };
console.error('【全局错误捕获】:', errorInfo);
reportErrorToExtension(errorInfo);
});
window.addEventListener('unhandledrejection', (event) => {
  const errorInfo = {
    type: 'unhandledRejection',
    reason: event.reason,
    promise: event.promise
  };
  console.error('【未处理的 Promise 拒绝】:', errorInfo);
  reportErrorToExtension(errorInfo);
}); 
      `);
		strHtml = replaceAssetPathsAdvanced(strHtml,(p)=>{
			if (port){
				return new URL(p,`http://localhost:${port}`).toString();
			}
			return panel!.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri,  'webUI',  p)
			).toString(); 			
		});
		strHtml = setScriptNonce(strHtml,nonce);
		//console.log(strHtml);
		panel!.webview.html = strHtml;
        //panel.webview.postMessage({code});
        //console.log(code);
        
    }); 
};
export function previewFile(uri: vscode.Uri,context: vscode.ExtensionContext) {
    if (panel===null){
        panel = vscode.window.createWebviewPanel(
            'mgToy Preview',
            `Preview: ${path.basename(uri.fsPath)}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );
        panel.onDidDispose((e)=>{
            console.log("panel close");
            panel = null;
            stopServer();
            //vscode.commands.executeCommand("mgtoy.stop");
        });
        const outputChannel = vscode.window.createOutputChannel('mgToy');
        context.subscriptions.push(outputChannel);
        
        outputChannel.clear();
        outputChannel.show();
        //vscode.window.setStatusBarMessage()
        panel.webview.onDidReceiveMessage(
          message => {
           // if (message.type === 'webviewError') {
              //vscode.window.createOutputChannel()
              // 此时，错误信息会作为普通的扩展日志，输出在“调试控制台”(DEBUG CONSOLE)中
              //vscode.window.showErrorMessage('js Error',{modal:true,detail:JSON.stringify(message.payload,null,2)});
              outputChannel.append(JSON.stringify(message,null,2));
              outputChannel.appendLine('');
              console.error('[Webview Error]', message.payload);
              // 你甚至可以选择在这里用 vscode.window.showErrorMessage 向用户弹窗提醒
           // }
          },
          undefined,
          context.subscriptions
        );
        
        //vscode.commands.executeCommand("mgtoy.start");
        startServer(context, uri,(ser)=>{
            setWebviewHtml(uri,context,ser.httpPort);
        }); 
    }else{ 
        if (defaultSerConfig.ser){
            const name = path.basename(uri.fsPath);
            panel.title = `Preview: ${name}`;
            defaultSerConfig.ser.conf.rootPath = uri.fsPath; 
            //dc.send(JSON.stringify({ type:"file",name:path.basename(conf.rootPath)}));
            pool.getAllConnectionIds().forEach(id=>{
              pool.getConnection(id)?.dc.send(JSON.stringify({type:"file",name }));
            });
            setWebviewHtml(uri,context,defaultSerConfig.ser.httpPort);
        } 
    } 
}
 