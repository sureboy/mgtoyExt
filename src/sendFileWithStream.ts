import * as fs from 'fs';
import * as path from 'path';
import  {
  RTCPeerConnection ,
  RTCDataChannel ,
  RTCIceCandidate,
  RTCSessionDescription,
  signatures
  } from 'werift';
/**
 * 分块发送文件
 * @param filePath 文件绝对路径 (可用 vscode.Uri.fsPath 获取)
 * @param dataChannel 已打开的 RTCDataChannel
 * @param chunkSize 每块大小，默认 16KB
 */
export async function sendFileWithStream(
    filePath: string,
    dataChannel: RTCDataChannel,
    //totalSize:number,
    chunkSize: number = 16 * 1024
): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        //const stats = fs.statSync(filePath);
        //const totalSize = stats.size;
        let sentSize = 0;

        // 1. 发送元数据 (JSON 字符串)
        //const metadata = {
        //    fileName: path.basename(filePath),
        //    fileSize: totalSize,
        //};
        //dataChannel.send(JSON.stringify(metadata));
        //console.log(`元数据已发送: ${metadata.fileName}, 总大小 ${totalSize}`);

        // 2. 创建读取流，按 chunkSize 分块
        const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize  });
        stream.on('data', (chunk) => {
            // 将 Buffer 转换为 ArrayBuffer 发送
            //Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            //const arrayBuffer = Uint8Array.from(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)).buffer;
            dataChannel.send(chunk);
            sentSize += chunk.length;

            // 背压控制：如果缓冲区堆积太多，暂停流
            if (dataChannel.bufferedAmount > 1024 * 1024) { // 超过 1MB
                stream.pause();
                dataChannel.addEventListener('bufferedamountlow', () => {
                    stream.resume();
                });
                //dataChannel.onbufferedamountlow = () => {
                //    dataChannel.onbufferedamountlow = null;
                //    stream.resume();
                //};
            }
        });

        stream.on('end', () => {
            console.log(`文件发送完成: ${filePath}`);
            resolve(sentSize);
        });

        stream.on('error', (err) => {
            console.error('读取文件流错误:', err);
            reject(err);
        });
    });
}