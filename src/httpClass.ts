import * as http from 'http'; 
export const httpServer = class {
    constructor(
        public port:number,
        //private readonly rootPath:string,
        private readonly Ser:http.Server
    ){

    }
};