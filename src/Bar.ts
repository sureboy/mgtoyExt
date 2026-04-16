//import {getLocalIp} from './util';
import * as vscode from 'vscode';
//import {defaultSerConfig} from './http';
export const initBar = (port:number,loadIP:string  )=>{
    //if (menu){
        //return;
    const Bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    let menu:vscode.Disposable|undefined =undefined;
    //menu?.dispose();
    //}
    //const loadIP = getLocalIp();
    Bar.command="menu";
    const ipUrl = `http://${loadIP}:${port}/conn.html`;
    Bar.text = ipUrl;
    const loadUrl = `http://localhost:${port}/control.html`;
    const menuList = [ 
        "start",
        "stop", 
    ];
   
    //if (defaultSerConfig.ser){
		menuList.push(ipUrl,loadUrl); 
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
            
            vscode.commands.executeCommand("mgtoy."+v);                            
        });
    }); 
    Bar.show();
    return Bar;
    
};