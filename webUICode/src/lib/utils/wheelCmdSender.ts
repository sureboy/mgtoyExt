export const createCmdSender = (sendMsg:(n:number)=>void) => {
    let currentTimer: NodeJS.Timeout | null = null;
    let currentN: number | undefined; 
    const wheel = {
        up:1|(1<<2),
        down:2|(2<<2),
        left:2|(1<<2),
        right:1|(2<<2),
        stop:0,
    };
    const wheelNumber = [
        ()=>0,
        ()=>wheel.down & wheel.left,
        ()=>wheel.down,
        ()=>wheel.down & wheel.right,
        ()=>wheel.left,
        ()=>0,
        ()=>wheel.right,
        ()=>wheel.up & wheel.left,
        ()=>wheel.up,
        ()=>wheel.up & wheel.right,
    ];
    const changeNumber=[ 0,6,3,2,1,4,7,8,9 ];
    return (n: number) => {
        if (currentN === n) {return;}
        if (currentTimer) {clearTimeout(currentTimer);}
        sendMsg(wheelNumber[changeNumber[n]]());
        //console.log(wheelNumber[changeNumber[n]]);
        currentN = n;

        const tick = () => {
            if (currentN === 0) {return;}      // 若n=0则停止循环
            //console.log(wheelNumber[changeNumber[currentN!]]);
            sendMsg(wheelNumber[changeNumber[currentN]]());
            currentTimer = setTimeout(tick, 1000);
        };

        if (n !== 0) {
            currentTimer = setTimeout(tick, 1000);
        }
    };
};