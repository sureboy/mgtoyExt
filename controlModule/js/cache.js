const nameMap = new Map();
const addrMap = new Map();
export const  getDBFromAddr = (k)=>{
     return addrMap.get(k);
};
export const  getDBFromName = (k)=>{
     return nameMap.get(k);
};
export const setClientDB = (addr,_db)=>{
    addrMap.set(addr,_db) ;
    nameMap.set(_db.DB.Carname,_db);
};
export const postMessage =window.parent?window.parent.postMessage:console.log;

postMessage({ 
    start:{
        udp:{
            port:9002
        }            
    },
    serial:'serial com1'
});



