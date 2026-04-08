import {Bonjour} from "bonjour-service";


export const initMDNS = (port:number)=>{
    const bon  =new Bonjour();
    const service = bon.publish({
        protocol: 'tcp',
        name: 'MGToy Server',
        type: 'http',
        port: port,
        host: 'mgtoy.local',
        txt: {
            version: '1.0.0',
            api: 'rest'
        }
    });

    // 事件监听
    service.on('up', () => {
        console.log('服务已发布');
    });

    service.on('down', () => {
        console.log('服务已停止');
    });

    // 查找服务
    const browser = bon.find({ type: 'http' });

    browser.on('up', (service) => {
        console.log('发现服务:', service.name, service.addresses);
    });

    browser.on('down', (service) => {
        console.log('服务下线:', service.name);
    });
    return bon;
};