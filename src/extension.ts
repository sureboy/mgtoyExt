// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
//import {
	//stopServer,
	//startServer
//} from './init';
//import {createWebRtcConn} from './webRtcHost';
import {previewFile} from './preview';
//import {SerialPortTest} from './serial';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) { 
	//console.log('Congratulations, your extension "mgtoy" is now active!'); 
	/*
	const conn = vscode.commands.registerCommand('mgtoy.conn', () => { 
		vscode.window.showQuickPick(['create','append']).then(value=>{ 
			createWebRtcConn(value==="create","zaddone.com:9003");
		}); 
	});  
	
	const stop =  vscode.commands.registerCommand('mgtoy.stop', () => { 
		stopServer();
	}); 
	const start = vscode.commands.registerCommand('mgtoy.start', () => {  
		const config = vscode.workspace.getConfiguration("mgtoy");
		startServer(context ,vscode.Uri.joinPath(context.extensionUri,config.get("webUI")||"webUI","index.html") );
		vscode.window.showInformationMessage('Hello World from mgtoy!');
	}); */ 
	const preview = vscode.commands.registerCommand('mgtoy.previewInWebview',(uri: vscode.Uri)=>{
		previewFile(uri,context);
	});
	context.subscriptions.push(
		//start,
		//stop,
		//conn,
		preview);
}

// This method is called when your extension is deactivated
export function deactivate() {}
