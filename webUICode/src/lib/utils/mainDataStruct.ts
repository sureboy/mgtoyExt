export type infoStruct = {
  cars:any[],
  codeInput?:HTMLTextAreaElement
  sendBtn?:HTMLButtonElement
  info?:HTMLDivElement
}
export type  signalingStruct = {
  ICEList:RTCIceCandidateInit[],
  offer?:string,
  answer?:string,
  backUrl?:string,
  id:string
}