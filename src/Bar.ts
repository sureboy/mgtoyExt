import {getLocalIp} from './util';
import * as vscode from 'vscode';
import {defaultSerConfig} from './http';
export const initBar = ( clearFunc?:()=>void)=>{
    //if (menu){
        //return;
    const Bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    let menu:vscode.Disposable|undefined =undefined;
    //menu?.dispose();
    //}
    const loadIP = getLocalIp();
    Bar.command="menu";
    const ipUrl = `http://${loadIP}:${defaultSerConfig.ser?.httpPort}`;
    Bar.text = ipUrl;
    const loadUrl = `http://localhost:${defaultSerConfig.ser?.httpPort}`;
    const menuList = [ 
        "start",
        "stop", 
    ];
   
    if (defaultSerConfig.ser){
		menuList.push(ipUrl,loadUrl); 
    } 
    menu = vscode.commands.registerCommand('menu', () => {
        vscode.window.showQuickPick(menuList).then(v=>{
            if (!v){
                return;
            }
            if (v.startsWith("http://")){
                vscode.env.openExternal(vscode.Uri.parse(v));
                return;
            }
            if (v==="onload" || v==="stop"){
                //Bar.hide();
                Bar.text="";
                //ser.Server?.close(); 
                //ser.Server?.closeIdleConnections(); 
                //panel?.dispose();
                if (clearFunc){
                    clearFunc();
                }
                
                //if (v==="stop"){
                //    defaultSerConfig.close();
                //    return; 
                    //ser.Server?.close(); 
                    //defaultSerConfig.ser?.Server?.closeIdleConnections(); 
                    //defaultSerConfig.ser = undefined;
                //} 
            }
            vscode.commands.executeCommand("mgtoy."+v);                            
        });
    }); 
    Bar.show();
    return Bar;
    
};