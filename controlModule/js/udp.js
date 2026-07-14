import {getDBFromAddr,setClientDB,postMessage} from './cache.js';
const apMap = new Map();
let isRun = false;
let move = [4,2,1,3];
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
            if (db){
                Object.assign(db,_db);
            }else{
                setClientDB(k,_db); 
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
            handleApList(msg,()=>{
                if (isRun){
                    return;
                }
                isRun=true;
                sendMsg.push(move);
                if (move===4){
                    move = 6;
                }else{
                    move = 4;
                }
                setTimeout(()=>{
                    postMessage({msg:new Uint8Array([sendMsg[0],8]),udp});
                    isRun = false;
                },1*1000);
            });
            break;
             
    }
    postMessage({msg:new Uint8Array(sendMsg),udp});
    /*
    server.send(new Uint8Array(sendMsg),rinfo.port, rinfo.address,err=>{
        if (err){
            console.error(err);
        }
    });*/
});
const HISTORY_LEN = 3;
let waveHistory = [];
let waveHistorySum = 0; 
let waveAction = 1;
const handleApList = (msg,isStop)=>{
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
        val +=   ( v.avg/sumRssi )* v.wave;
    });
    
     
    //WaveList =  WaveList.slice(-3);
    //let waveNow =WaveList.reduce((t,v)=>{
    //    return t+v;
    //})/3;

    

    const rssiWave = val/sumRssi;
    if (!rssiWave){return;}

    if (waveHistory.length < HISTORY_LEN){
        waveHistory.push(rssiWave);
        waveHistorySum += rssiWave;
        //waveHistoryLen ++;
        return;
    }
    waveAction <<=1;
    const waveAvg = waveHistorySum/waveHistory.length; 
    if (waveAvg>rssiWave){
        const diff = waveHistory.reduce((t,v,i)=>{ 
            const _v = waveAvg - v; 
            return t + ((_v<0)?-_v:_v);
        })/waveHistory.length;
        //console.log(diff);
        if ((waveAvg - rssiWave)>diff){
            
            
            console.log("stop",waveAction,waveAction&2);
            if ((waveAction&2) === 0 ){
                console.log("run stop");
                waveAction|=1;
                if (msg[1]!==0){
                    isStop(); 
                } 
            }
        }
    }else if ((waveAction&3)===0){
        console.log("run stop 7");
        waveAction|=1;
        if (msg[1]!==0){
            isStop(); 
        } 
    }
    


    waveHistory.push(rssiWave);
    waveHistorySum += rssiWave;
    if (waveHistory.length>HISTORY_LEN){
        waveHistorySum -= waveHistory.shift(); 
    }
    console.log(num,msg[1], waveAvg,  rssiWave );
    return;
   
};
function toInt8(byte) {
  // 假设 byte 范围是 0-255
  return byte > 127 ? byte - 256 : byte;
}