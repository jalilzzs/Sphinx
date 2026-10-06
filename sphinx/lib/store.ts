import { create } from 'zustand';
export type Lang='en'|'ar';
export type Screen='splash'|'menu'|'loading'|'game'|'cutscene'|'end';
export const DEFAULT_KEYS={fwd:'w',back:'s',left:'a',right:'d',sprint:'shift',crouch:'c',light:'f',phone:'p',inv:'i',act:'e'};
export const PRESETS={low:{res:.6,shadows:false,aa:'none',post:false,fps:30},med:{res:1,shadows:false,aa:'fxaa',post:true,fps:60},high:{res:1.25,shadows:true,aa:'smaa',post:true,fps:0}} as const;
const CFG=['master','bgm','sfx','res','quality','shadows','aa','fps','post','sens','uiScale','touchResp','keys','lang'];
const saved=()=>{try{return JSON.parse(localStorage.getItem('sphinx_cfg')||'{}')}catch{return {}}};
type S={lang:Lang;screen:Screen;scene:string;quality:'low'|'med'|'high';master:number;bgm:number;sfx:number;res:number;shadows:boolean;aa:'none'|'fxaa'|'smaa';fps:0|30|60;post:boolean;sens:number;uiScale:number;touchResp:number;keys:typeof DEFAULT_KEYS;
 touch:boolean;move:{x:number;y:number};sprint:boolean;crouch:boolean;light:boolean;stamina:number;phoneOpen:boolean;invOpen:boolean;pauseOpen:boolean;settingsOpen:boolean;
 inventory:string[];achievements:string[];flags:Record<string,boolean>;user:{id:string;name:string;avatar?:string}|null;toast:string;prompt:string;note:string;actReq:number;exitReq:number;
 set:(p:Partial<S>)=>void;unlock:(id:string)=>void;say:(m:string)=>void};
export const useGame=create<S>((set,get)=>({lang:'en',screen:'splash',scene:'bathroom_interior',quality:'med',master:1,bgm:.7,sfx:.85,...PRESETS.med,sens:.5,uiScale:1,touchResp:1,keys:{...DEFAULT_KEYS},
 touch:false,move:{x:0,y:0},sprint:false,crouch:false,light:false,stamina:100,phoneOpen:false,invOpen:false,pauseOpen:false,settingsOpen:false,
 inventory:[],achievements:[],flags:{},user:null,toast:'',prompt:'',note:'',actReq:0,exitReq:0,
 ...(typeof window!=='undefined'?saved():{}),
 set:p=>{set(p as any);if(CFG.some(k=>k in p)){const s:any=get();localStorage.setItem('sphinx_cfg',JSON.stringify(Object.fromEntries(CFG.map(k=>[k,s[k]]))))}},
 unlock:id=>{if(get().achievements.includes(id))return;set({achievements:[...get().achievements,id],toast:id});setTimeout(()=>set({toast:''}),2800)},
 say:m=>{set({note:m});setTimeout(()=>{if(get().note===m)set({note:''})},3500)}}));
