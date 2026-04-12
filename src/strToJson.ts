export function stringToBase64Url(str:string) {
  // 1. 使用 TextEncoder 将字符串转换为 UTF-8 字节数组
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // 2. 将字节数组转换为二进制字符串
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  
  // 3. 转换为 Base64URL
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Base64URL 转字符串
export function base64UrlToString(base64Url:string) {
  // 1. 还原为标准 Base64
  let base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // 2. 添加填充字符
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  
  // 3. 解码 Base64
  const binary = atob(base64);
  
  // 4. 将二进制字符串转换为字节数组
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  // 5. 使用 TextDecoder 解码为字符串
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}