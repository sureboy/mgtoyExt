//const root = await navigator.storage.getDirectory();

// 创建/写入文件
async function writeToOPFS(fileName, data, root: FileSystemDirectoryHandle) {
  const fileHandle = await root.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data); // data 可以是 ArrayBuffer, Blob, 或 Uint8Array
  await writable.close();
  console.log(`文件已保存到 OPFS: ${fileName}`);
}

// 读取回文件
async function readFromOPFS(fileName, root: FileSystemDirectoryHandle) {
  const fileHandle = await root.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  return buffer;
}

const handleFile = (f: File)=>{
    const decoder = new TextDecoder();
    f.arrayBuffer().then(v=>{
        const code = decoder.decode(v);

    })
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