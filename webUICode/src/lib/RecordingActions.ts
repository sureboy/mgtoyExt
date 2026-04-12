let Playing = false
//let time = performance.now()
type RecordingType = {time:number,msg:number} 
//let lastValue:RecordingType
let RecordingValue:RecordingType[] = []
/*
export const playStatus = (playing:boolean) => {
    Playing = playing
    if (Playing){
        lastValue = {time:performance.now(),msg:0}
        //time = performance.now()
        value.push(lastValue)
    }else{

    }
}
*/
export const clearRecording = ()=>{
    RecordingValue = []
    //lastValue = {time:performance.now(),msg:0}
    //RecordingValue = [lastValue]
    //RecordingValue.push(lastValue)
}
export const getRecording = ()=>{
    //if (lastValue){
    //    lastValue.time = performance.now() - lastValue.time
    //}
    return RecordingValue
}
export const pushRecording = (msg:number)=>{
    //if (!Playing)return
    //let endTime = performance.now()

    //StartRecordingValue()
    //endRecording()
    //lastValue = {time,msg}
    
    if (!musicRecording.audioElement || !musicRecording.playing){
        return
    }
    //console.log(musicRecording.audioElement?.currentTime*1000)

    
    RecordingValue.push({
        time:musicRecording.audioElement?.currentTime*1000,msg})
    //return RecordingValue
}

export const musicRecording:{
    audioElement?: HTMLAudioElement,
    playing:boolean,
    RecordingValue:RecordingType[],
    //currentTime:number,
    selfDances(handleStartNumber:(n:number)=>void,id:number ):void
    assign( 
        RecordingValue:RecordingType[],
        //currentTime:number
    ):void,
    //callback?:(n:number)=>void
} = {
    playing:false,
    RecordingValue:[],
    //currentTime:0,
    selfDances:function(handleStartNumber,id ){
        //const li = this.RecordingValue
        //console.log(this)
        //handleStartNumber(0)
        if (!this.audioElement){
            handleStartNumber(0)
            return
        }
        if (!this.RecordingValue || this.RecordingValue.length===0 || !this.playing){
            //this.callback(0)
            handleStartNumber(0)
            return
        }

        //let t=0
        const currentTime = this.audioElement.currentTime*1000
        if (id ===0  ){
            //t = currentTime
            let i = 1
            for( ;i<this.RecordingValue.length;i++){
                if ( currentTime < this.RecordingValue[i].time) {
                    id = i-1
                    //t = t-this.RecordingValue[id].time
                    break
                }                
            }
            if (i===this.RecordingValue.length){
                handleStartNumber(0)
                return
            }
        } 

        const rec = this.RecordingValue[id]
        handleStartNumber(rec.msg)
        //this.callback(r.msg)
        //if (currentTime>0){
        //    rec.time = this.audioElement.currentTime
        //}
        //console.log(currentTime,time)
        id++;
        //console.log(id)
        if (id< this.RecordingValue.length){

        const nextRec = this.RecordingValue[id]
        rafTimeout(()=>{
            
            if (id>=this.RecordingValue.length){
                handleStartNumber(0)
                return
            }
            this.selfDances(handleStartNumber,id)
        },nextRec.time - currentTime)
        }
    },
    assign:function( 
        RecordingList:RecordingType[],
        //currentTime:number
    ){
        if (!RecordingList || RecordingList.length===0){
            return
        }
        if ( !this.RecordingValue || this.RecordingValue.length===0 ){
            this.RecordingValue = RecordingList
            return
        }
        //let t = 0
        //let beginTime = currentTime
        //RecordingList.forEach((v,i)=>{
        //    beginTime -= v.time
        //})
        //let beginTime = currentTime - t
        const b = RecordingList[0].time
        const e = RecordingList[RecordingList.length-1].time
        //console.log(beginTime , currentTime ,  RecordingList.length)
        //if (beginTime<0)beginTime=0
        let t = 0
        let begin:RecordingType[] = []
        let end:RecordingType[] =[]
        this.RecordingValue.forEach((v:RecordingType,i:number)=>{
            //t += v.time
            if (v.time>=b){
                begin = this.RecordingValue.slice(0,i)
                //v.time = t-beginTime 
            }else if (v.time >=e ){
                end = this.RecordingValue.slice(i-1)
                //v.time = t-currentTime
            }
        })
        //console.log(begin,end)
        this.RecordingValue = begin.concat(RecordingList,end)
    }
}
function rafTimeout(callback:()=>void, delay:number) {
  const start = performance.now();
  function loop(timestamp:number) {
    const elapsed = timestamp - start;
    if (elapsed >= delay) {
      callback();
    } else {
      requestAnimationFrame(loop);
    }
  }
  requestAnimationFrame(loop);
  //return start
}