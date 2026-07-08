import {getDBFromAddr,setClientDB,postMessage} from './cache.js';
const apMap = new Map();
window.addEventListener('message',(ev)=>{
    //console.log(ev.data);
    const {msg,udp} = ev.data;
    if (!msg || !udp){
        return;
    }
    const k = `${udp.address}:${udp.port}`;
    const db = getDBFromAddr(k);
    
    const sendMsg =  [msg[0]];

    if (db){
        db.Update = Date.now();
        db.Num = msg[0];
    }else{    
        sendMsg.push(255); 
    }   
    //console.log(sendMsg,msg.length)
    switch (msg.length) {
        /*
        case 1:
            if (db){
                db.Update = Date.now();
                db.Num = msg[0];
            }else{    
                sendMsg.push(255); 
            }               
            break;
    */
        case 12: 
            const _db ={
                Update:Date.now(),
                Num:msg[0],
                DB:{
                    LocalIP:new Uint8Array(msg.subarray(8).map(v=>v^255)),
                    RemoteIP:udp.address,//new Uint8Array(rinfo.address.split(".").map(v=>Number(v))),
                    Carname:new TextDecoder().decode(msg.subarray(2,8) ) ,
                    RemotePort:udp.port,
                    Control: msg[1],
                }
            };
            //console.log("client",_db);
            if (db){
                Object.assign(db,_db);
            }else{
                setClientDB(k,_db);
                //addrMap.set(k,_db) ;
                //nameMap.set(_db.DB.Carname,_db);
                //if (conf.newCar){
                //newCar?.(_db);
                //console.log(_db)
         
                postMessage({
                    menu:{
                        name:_db.DB.Carname,
                        update:_db.Update,
                        type:"udp",
                        rawDate:_db
                    }
                }) ;               
            }
            break; 
        default:
            //const li = [];
            apMap.forEach(v=>{
                v.action <<=1;
                v.type  = (v.type<<1) | msg[1];
            });
            for (let i=2;i<msg.length;i+=7){
                //li.push(msg.subarray(i,i+7));
                const k = msg.subarray(i,i+6).toString();
                if (apMap.has(k)){
                    const val = apMap.get(k);
                    if (val.rssi.length>=32){
                        val.rssi.shift();
                    }
                    val.rssi.push(msg[i+7]);
                    val.action |= 1;
                    console.log(val);
                }else{
                    apMap.set(k,{rssi:[msg[i+7]],action:1,type:msg[1] });
                }
                
                
            }
            //console.log(li);
            //msg.subarray(1,msg.length)
            //console.log((msg.length-1)/7,msg.toString());
            //return;
    }
    postMessage({msg:new Uint8Array(sendMsg),udp});
    /*
    server.send(new Uint8Array(sendMsg),rinfo.port, rinfo.address,err=>{
        if (err){
            console.error(err);
        }
    });*/
});