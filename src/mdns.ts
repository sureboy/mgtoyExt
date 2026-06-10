import Bonjour from 'bonjour-service';

// 创建 Bonjour 实例
export const mdnsServer = (serverip:string)=>{
    const bonjour = new Bonjour(); 
    const browser = bonjour.find({ type: 'http' }); 
    browser.on('up', (service) => {
        service.addresses?.forEach((ip:string)=>{
            fetch(`http://${ip}/setserver?ip=${serverip}`).then(res=>{
                console.log("setserver",res.ok);
            }).catch((err)=>{
                console.error(err);
            });
        });
       
        console.log('服务上线:', {
            名称: service.name,
            主机: service.host,
            端口: service.port,
            地址: service.addresses,
            TXT记录: service.txt
        });
    }); 
    browser.on('down', (service) => {
        console.log('服务下线:', service.name);
    });
};
