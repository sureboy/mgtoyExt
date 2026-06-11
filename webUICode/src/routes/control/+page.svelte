<script lang="ts">   
import Joystick from "$lib/components/Joystick.svelte";
import {onMount} from "svelte" 
const nameMap = new Map();
const addrMap = new Map();
const currentClient:{rawDate?:any,[key:string]:any} = {}
onMount(()=>{  
    let postMessage =window.parent?window.parent.postMessage:console.log;
    postMessage({ 
        start:{
            udp:{
                port:9002
            }            
        }    
    })


    window.addEventListener('message',(ev)=>{
        const {client} = ev.data
        if (!client){
            return;
        }
        
        Object.assign(currentClient,client)
        console.log("client",currentClient)
    })
    window.addEventListener('message',(ev)=>{
        const {msg,udp} = ev.data
        if (!msg || !udp){
            return
        }
        const k = `${udp.address}:${udp.port}`;
        const db = addrMap.get(k);
        const sendMsg =  [msg[0]];
        switch (msg.length) {
            case 1:
                if (db){
                    db.Update = Date.now();
                    db.Num = msg[0];
                }else{    
                    sendMsg.push(255); 
                }               
                break;
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
                    }};
                //console.log(_db);
                if (db){
                    Object.assign(db,_db);
                }else{
                    addrMap.set(k,_db) ;
                    nameMap.set(_db.DB.Carname,_db);
                    //if (conf.newCar){
                    //newCar?.(_db);
                    postMessage({
                        menu:{
                            name:_db.DB.Carname,
                            update:_db.Update,
                            type:"udp",
                            rawDate:_db
                        }
                    })

                    
                }
                break; 
            default:
                console.log(msg.length,msg.toString());
        }
        postMessage({msg:new Uint8Array(sendMsg),udp})
        /*
        server.send(new Uint8Array(sendMsg),rinfo.port, rinfo.address,err=>{
            if (err){
                console.error(err);
            }
        });*/
    })
})
</script>
<Joystick clickEvent={(n)=>{
    //console.log(n)

    const db =currentClient.rawDate 
    //const db = nameMap.get(currentClient.name)||currentClient.rawDate
    if (db){
        const senddb = {
            msg:new Uint8Array([db.Num,Number(n||0)|0xF0 ]),
            udp:{
                port:db.DB.RemotePort,
                address:db.DB.RemoteIP,
            }
        }
        console.log("send",senddb)
        postMessage(senddb);
    }
}}></Joystick>
 