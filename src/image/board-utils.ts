import type { ImageOptions } from './types'
export function stageRatio(_model: undefined, options: ImageOptions) {
 const value = options.aspectRatio ?? options.size ?? '1:1';
 const parts = value.split(/[:x]/).map(Number);
 return parts.length === 2 && parts[0]>0 && parts[1]>0 ? parts[0]/parts[1] : 1;
}
export function elapsed(from: string, now: number) {
 const seconds=Math.max(0,Math.round((now-Date.parse(from))/1000));
 return seconds<60 ? `${seconds}s` : `${Math.floor(seconds/60)}m ${seconds%60}s`;
}
export function takeErrorText(take:{error:string|null;errorCode?:string|null},t:(key:string)=>string,fallback:string) {
 const key=take.errorCode ? `lab.board.err_${take.errorCode}` : null;
 const coded=key?t(key):null; return coded && coded!==key ? coded : take.error || fallback;
}
