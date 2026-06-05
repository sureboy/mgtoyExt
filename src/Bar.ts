//import {getLocalIp} from './util';
import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import {defaultSerConfig} from './http';
export const initBar = (port:number,loadIP:string   )=>{
    //if (menu){
        //return;
    const Bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    let menu:vscode.Disposable|undefined =undefined;
    //menu?.dispose();
    //}
    //const loadIP = getLocalIp();
    const config = vscode.workspace.getConfiguration("mgtoy");
    const host = config.get("host")||'mgtoy.cn';
    Bar.command="menu";
    const ipUrl = `http://${loadIP}:${port}`;
    Bar.text = ipUrl;
    Bar.tooltip="Generating QR code...";
    const loadUrl = `http://localhost:${port}`;
    const menuList = [ipUrl,loadUrl];
    const testUrl= `http://${loadIP}:5173/control`;
    const udpHost = `${loadIP}:9003`;
    const webHost = `http://${loadIP}:8088`;
    const textToEncode =`${ipUrl}/conn?url=${testUrl}&host=${udpHost}&web=${webHost}`;
    const textToEncode1 =`${ipUrl}/conn.html#${testUrl}`;
    QRCode.toDataURL(textToEncode, { margin: 1, width: 150 }, (err, url) => {
        if (err) {
            Bar.tooltip = `Failed: ${err.message}`;
            return;
        }
        // 创建一个 MarkdownString，支持图片
        const markdown = new vscode.MarkdownString(
            `![QR Code](${url})\n\n**${textToEncode}**\n\n**${textToEncode1}**`
        );
        markdown.supportHtml = true;  // 可开启 HTML 支持（非必须）
        markdown.isTrusted = true;     // 信任内容，允许图片加载
        Bar.tooltip = markdown;
    });
    //if (defaultSerConfig.ser){
	//	menuList.push(ipUrl,loadUrl); 
    //} 
    menu = vscode.commands.registerCommand('menu', () => {
        vscode.window.showQuickPick(menuList).then(v=>{
            if (!v){
                return;
            }
            if (v.startsWith("http://")){
                vscode.env.openExternal(vscode.Uri.parse(v));
                return;
            }
            defaultSerConfig.ser?.clientMap.get(v)?.();
            //vscode.commands.executeCommand("mgtoy."+v);                            
        });
    }); 
    Bar.show();
    return {Bar,menu,menuList};
    
};