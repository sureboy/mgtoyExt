type DataStruct = {
	//LocalIP net.IP
	//Name    string
	//onceback func()
	DB :    Receive
	Update: number
	Num  :  number
}
type Receive ={
	LocalIP   : Uint8Array
	Carname :   string
	RemotePort: number
	RemoteIP :  string
	Control  :  number
	//Num        uint8
}

export const addrMap = new Map<string,DataStruct>();
export const nameMap = new Map<string,DataStruct>();