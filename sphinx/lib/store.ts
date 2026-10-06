import { create } from 'zustand';
export type Lang='en'|'ar';
export type Screen='splash'|'menu'|'loading'|'game'|'cutscene'|'end';
type S={lang:Lang;screen:Screen;scene:string;quality:'low'|'med'|'high';sens:number;bgm:number;sfx:number;touch:boolean;
 move:{x:number;y:number};sprint:boolean;crouch:boolean;light:boolean;stamina:number;phoneOpen:boolean;invOpen:boolean;
 inventory:string[];achievements:string[];flags:Record<string,boolean>;user:{id:string;name:string;avatar?:string}|null;
 set:(p:Partial<S>)=>void;unlock:(id:string)=>void;toast:string;};
export const useGame=create<S>((set,get)=>({lang:'en',screen:'splash',scene:'bathroom_interior',quality:'med',sens:.5,bgm:.7,sfx:.85,touch:false,
 move:{x:0,y:0},sprint:false,crouch:false,light:false,stamina:100,phoneOpen:false,invOpen:false,inventory:['ink','pendant','batteries','cassette'],achievements:[],flags:{},user:null,toast:'',
 set:p=>set(p as any),unlock:id=>{if(get().achievements.includes(id))return;set({achievements:[...get().achievements,id],toast:id});setTimeout(()=>set({toast:''}),2800)}}));
