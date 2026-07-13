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
            handleApList(msg);
            break;
            if ((msg.length >=9) && ((msg.length-2) %7 ===0)){ 
                apMap.forEach(v=>{
                    v.action <<=1; 
                });
                const status = [0,0];
                let num = 0;
                for (let i=2 ;i<msg.length;i+=7,num ++){ 
                    const k = msg.subarray(i,i+6).toString(); 
                    if (apMap.has(k)){
                        const val = apMap.get(k);
                        if (val.rssi.length>=5){
                            val.rssi.shift();
                            const _v = val.variations.shift();
                            if (_v.wave){
                                val.varSum -=_v.wave;
                            }
                        }
                        val.rssi.push(msg[i+6]); 
                        val.action |= 1;
                        const [rssi1,rssi2] = val.rssi.slice(-2);  
                        if ((val.action & 3) ===3){ 
                            
                            if (!rssi1 || !rssi2){
                                console.log(val);
                            }
                            const variation = {wave:rssi1-rssi2  ,run:msg[1]};
                            if (variation.wave< 0){
                                //status[0]+=rssi2;
                                variation.wave = -variation.wave;
                            }
                            const avg = (val.rssi.reduce((t,n)=>{
                                return t +n ;
                            })/val.rssi.length);
                            console.log(avg-rssi2);
                            status[1]+=variation.wave/avg;
                            //console.log(status[1]);
                             
                            //if (variation.wave<0){
                            //    variation.wave = - variation.wave;
                            //}
                            /*
                            if (val.avg){
                                let wv = val.avg - variation.wave;
                                //wv = (wv<0)?-wv:wv;
                                wv *= wv;
                                if ( wv >val.waveAvg){ 
                                    status[0]++;
                                    console.log(  wv ,val.waveAvg,variation.wave);
                                }else{
                                    status[1]++;
                                }
                            }*/
                            //avg = Math.sqrt(avg);
                            val.variations.push(variation); 
                            /*
                            val.waveSum += variation.wave;

                            val.avg = val.waveSum / val.variations.length;
                            let avgsum = 0;
                            val.variations.forEach((v,i_)=>{
                                let _v = val.avg - v.wave;
                                avgsum += _v*_v;
                            });
                            val.waveAvg = avgsum / val.variations.length; 
                            */
                        }else{
                            //console.log(k);
                            val.variations.push({});
                            //status[1]+=rssi2;
                        }
                        //console.log(val);
                    }else{
                        apMap.set(k,{rssi:[msg[i+6]],action:1,variations:[],waveSum:0,waveAvg:0,avg:0 });
                    }
                }
                console.log(status,status[1]/num);
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
const HISTORY_LEN = 5;
const waveHistory = [];
let waveHistorySum = 0;
//let waveHistoryLen = 0;
const handleApList = (msg)=>{
    if ((msg.length < 9) || ((msg.length-2) %7 !==0)){ 
        return;
    } 
    apMap.forEach(v=>{
        v.action <<= 1;  
    });
    let num = 0;
    //let sumWave = 0;
    let sumRssi = 0;
    //const rssiList = [];
    const waveList = [];
    for (let i=2 ;i<msg.length;i+=7){ 
        const k =msg.subarray(i, i+6).toString();
        /*
         Array.from(msg.subarray(i, i+6))
               .map(b => b.toString(16).padStart(2, '0'))
               .join(':'); */
        const rssi =  msg[i+6];
        if (!apMap.has(k)){
            apMap.set(k,{rssi:[rssi] ,action:1,rssiSum:rssi});
            continue;
        }
        const val = apMap.get(k); 
        if (val.rssi.length>=HISTORY_LEN){
            val.rssiSum -= val.rssi.shift(); 
        }
        val.rssi.push(rssi); 
        val.action |= 1;    
        val.rssiSum += rssi;   
        if ((val.action & 3) !==3){ 
            continue;
        }

        //console.log(arg,diff,val);
        const avg = val.rssiSum / val.rssi.length;
        //const _rssi = toInt8(rssi);
        sumRssi += rssi;
        //rssiList.push(rssi);
        num ++;
        let wave = avg - rssi;
        if (wave<0){
            wave = -wave;
        }
        waveList.push({wave,avg,rssi});
        //sumWave += wave/avg;  
    }
    let val = 0;
    
    waveList.forEach((v)=>{
        //console.log(v.rssi/sumRssi, v);
        val +=   ( v.rssi/sumRssi )* v.wave;
    });
    
     
    //WaveList =  WaveList.slice(-3);
    //let waveNow =WaveList.reduce((t,v)=>{
    //    return t+v;
    //})/3;

    

    const rssiK = val/sumRssi;
    if (!rssiK){return;}

    if (waveHistory.length===0){
        waveHistory.push(rssiK);
        waveHistorySum += rssiK;
        //waveHistoryLen ++;
        return;
    }
    const avg = waveHistorySum/waveHistory.length;
    const fx = waveHistory.reduce((t,v)=>{
        const _v = avg - v;
         
        return t + ((_v<0)?-_v:_v);
    })/waveHistory.length;
    let fx_ = rssiK - avg;
    const isMoving = fx_ > fx;
    if (msg[1]===0){
        waveHistory.push(rssiK);
        waveHistorySum += rssiK;
        if (waveHistory.length>HISTORY_LEN*4){
            waveHistorySum -= waveHistory.shift(); 
        }
    }
    console.log(num,msg[1],isMoving,fx_,fx,waveHistory,rssiK );
    //WaveLast = waveNow;
};
function toInt8(byte) {
  // 假设 byte 范围是 0-255
  return byte > 127 ? byte - 256 : byte;
}