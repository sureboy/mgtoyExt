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
            if ((msg.length >=9) && ((msg.length-2) %7 ===0)){ 
                apMap.forEach(v=>{
                    v.action <<=1;
                    //v.type  = (v.type<<1) | msg[1];
                });
                const status = [0,0];
                for (let i=2;i<msg.length;i+=7){
                    //li.push(msg.subarray(i,i+7));
                    const k = msg.subarray(i,i+6).toString();
                    
                    if (apMap.has(k)){
                        const val = apMap.get(k);
                        if (val.rssi.length>=32){
                            val.rssi.shift();
                            const _v = val.variations.shift();
                            if (_v.wave){
                                val.varSum -=_v.wave;
                            }
                        }
                        val.rssi.push(msg[i+6]);
                        //val.type.push(msg[1]);
                        val.action |= 1;
                        if ((val.action & 3) ===3){
                            
                            const [rssi1,rssi2] = val.rssi.slice(-2);  
                            if (!rssi1 || !rssi2){
                                console.log(val);
                            }
                            const variation = {wave:rssi1-rssi2  ,run:msg[1]};
                            if (val.waveAvg){
                                let wv = val.avg - variation.wave;
                                wv = (wv<0)?-wv:wv;
                                if (wv >val.waveAvg){ 
                                    status[0]++;
                                    console.log(val.waveAvg,wv);
                                }else{
                                    status[1]++;
                                }
                            }
                            //avg = Math.sqrt(avg);
                            val.variations.push(variation);

                            val.waveSum += variation.wave;

                            val.avg = val.waveSum / val.variations.length;
                            let avgsum = 0;
                            val.variations.forEach((v,i_)=>{
                                let _v = val.avg - v.wave;
                                avgsum += (_v<0)?-_v:_v;
                            });
                            val.waveAvg = avgsum / val.variations.length; 
                        }else{
                            //console.log(k);
                            val.variations.push({});
                        }
                        //console.log(val);
                    }else{
                        apMap.set(k,{rssi:[msg[i+6]],action:1,variations:[],waveSum:0,waveAvg:0,avg:0 });
                    }

                    
                    
                    
                }
                console.log(status);
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