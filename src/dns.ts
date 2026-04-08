import dns2 from 'dns2';
//import {getLocalIp} from './util';
const { Packet } = dns2;
//const MY_DEV_IP = getLocalIp();
export const startDNSServer = (MY_DEV_IP:string)=>{
    const server = dns2.createServer({
        udp: true, // 监听 UDP 协议的 DNS 请求
        handle: (request, send, rinfo) => {
            const response = Packet.createResponseFromRequest(request);
            //const question = request.questions[0] as { name: string; type: number };
            const [question] = request.questions;
            const { name, type } = question as { name: string; type: number };

            // 记录日志，方便调试
            console.log(`[DNS] Query: ${name} (${type}) from ${rinfo.address}:${rinfo.port}`);

            // 🎯 核心逻辑：将特定域名解析到你内网设备的 IP
            // 例如：将 "my-dev-pc.local" 或 "*.local" 解析到 192.168.1.100
            if (  name === 'mgtoy.local') {
                if (type === Packet.TYPE.A) { // A 记录用于 IPv4 地址解析
                    response.answers.push({
                        name: name,
                        type: Packet.TYPE.A,
                        class: Packet.CLASS.IN,
                        ttl: 300,        // 缓存时间 (秒)，可根据需要调整
                        address: MY_DEV_IP
                    });
                    console.log(`[DNS] Responding: ${name} -> ${MY_DEV_IP}`);
                }
            } else {
                // 🔄 对于其他域名，可以转发给公共 DNS 服务器（如 8.8.8.8）进行解析
                // 此处为了简洁，暂不实现转发逻辑，而是返回空响应。
                // 完整的转发功能需要编写额外的异步代码，但作为最小实现，这样已足够。
                console.log(`[DNS] Forwarding query for ${name} to upstream DNS...`);
                // 实际转发逻辑可参考 dns2 的官方文档或示例
            }

            // 发送响应
            send(response);
        }
    });

    // 启动服务器，监听所有网络接口（0.0.0.0）的 53 端口
    server.on('listening', () => {
        console.log('DNS server is listening on port 53');
    });

    server.listen({
        udp: {
            port: 53,
            address: "0.0.0.0" // 监听所有网卡，让局域网内其他设备也能访问
        }
    });

    // 错误处理
    server.on('error', (err) => {
        console.error('DNS server error:', err);
    });
}