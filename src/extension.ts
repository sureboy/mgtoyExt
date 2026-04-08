// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {stopServer,startServer} from './init';



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) { 
	//console.log('Congratulations, your extension "mgtoy" is now active!'); 
	const stop =  vscode.commands.registerCommand('mgtoy.stop', () => { 
		stopServer();
	});  
	const start = vscode.commands.registerCommand('mgtoy.start', () => {  
		startServer({port:3000,rootPath:vscode.Uri.joinPath(context.extensionUri,"webUI").fsPath});
		vscode.window.showInformationMessage('Hello World from mgtoy!');
	}); 
	context.subscriptions.push(start,stop);
}

// This method is called when your extension is deactivated
export function deactivate() {}
