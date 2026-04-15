
export type  signalingStruct = {
  ICEList:RTCIceCandidateInit[],
  offer?:string,
  answer?:string,
  backUrl?:string,
  id:string
}