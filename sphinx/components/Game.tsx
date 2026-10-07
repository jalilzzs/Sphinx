'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { supabase, signInGoogle, signOut } from '@/lib/supabase';
import { save, load, autosave } from '@/lib/saves';
import { ORDER } from '@/lib/scenes';
import { LORE } from '@/lib/puzzles';
import { unlockAudio, applyVol, click } from '@/lib/audio';
import GameCanvas from './GameCanvas';
import Hud from './Hud';
import Settings from './Settings';

export default function Game(){
  const g=useGame();const t=useT();const ar=g.lang==='ar';const [hint,setHint]=useState(0);
  useEffect(()=>{g.set({touch:matchMedia('(pointer:coarse)').matches});
    const apply=(u:any)=>g.set({user:u?{id:u.id,name:u.user_metadata?.full_name||u.email?.split('@')[0]||'Player',avatar:u.user_metadata?.avatar_url}:null});
    supabase.auth.getSession().then(r=>apply(r.data.session?.user));
    const {data}=supabase.auth.onAuthStateChange((_,s)=>apply(s?.user));
    const unlock=()=>{unlockAudio();applyVol()};addEventListener('pointerdown',unlock);addEventListener('keydown',unlock);   // autoplay policy: resume on first gesture
    return()=>{data.subscription.unsubscribe();removeEventListener('pointerdown',unlock);removeEventListener('keydown',unlock)}},[]);
  useEffect(()=>{document.documentElement.dir=ar?'rtl':'ltr';document.documentElement.lang=g.lang},[g.lang]);
  const enter=(scene:string,then:'game'|'cutscene'='game')=>{g.set({err:''});setHint(Math.floor(Math.random()*3));g.set({screen:'loading',scene,phoneOpen:false,invOpen:false,prompt:''});setTimeout(()=>{g.set({screen:then});autosave()},2600)};
  useEffect(()=>{if(!g.exitReq)return;const i=ORDER.indexOf(g.scene);if(i>=ORDER.length-1)enter(g.scene,'cutscene');else enter(ORDER[i+1])},[g.exitReq]);
  const inGame=g.screen==='game'||g.screen==='cutscene'||g.screen==='loading';const lore=LORE[g.scene];
  return <main className="fixed inset-0">
    {(inGame||g.screen==='end')&&<GameCanvas/>}
    {!inGame&&g.screen!=='end'&&<div className="fixed top-3 end-3 z-30 glass flex items-center gap-2 ps-4 pe-1.5 py-1.5 cursor-pointer" onClick={()=>g.user?signOut():signInGoogle()}>
      <span className="text-sm">{g.user?g.user.name:t('login')}</span><div className="w-8 h-8 rounded-full bg-gold text-ink grid place-items-center font-bold overflow-hidden">{g.user?.avatar?<img src={g.user.avatar} alt=""/>:(g.user?.name[0]||'?')}</div></div>}
    {g.screen==='splash'&&<div onClick={()=>g.set({screen:'menu'})} className="fixed inset-0 grid place-items-center text-center cursor-pointer bg-[radial-gradient(ellipse_at_50%_110%,#2b2417,#0c0b0e_65%)]"><div><h1 className="font-display text-[clamp(3.5rem,15vw,9rem)] tracking-[.3em] text-bone">SPHINX</h1><p className="mt-8 text-white/50 animate-pulse">{t('tap')}</p></div></div>}
    {g.screen==='menu'&&<div className="fixed inset-0 grid place-items-center p-4 bg-[radial-gradient(ellipse_at_20%_0,#14262a,#0c0b0e_60%)]"><div className="glass p-6 w-full max-w-sm flex flex-col gap-3">
      <h2 className="font-display text-4xl text-center tracking-widest">SPHINX</h2>
      <button className="btn !border-gold font-bold" onClick={()=>{click();g.set({inventory:[],flags:{},achievements:g.achievements});enter('bathroom_interior')}}>{t('start')}</button>
      <button className="btn" onClick={async()=>{click();if(await load())enter(useGame.getState().scene)}}>{t('cont')}</button>
      <button className="btn" onClick={()=>g.set({settingsOpen:true})}>{ar?'الإعدادات':'Settings'}</button>
      <button className="btn text-xs opacity-50" onClick={()=>{unlockAudio();enter('the_hallwyl_museum','cutscene')}}>{ar?'معاينة المشهد السينمائي (اختبار)':'Preview cutscene (test)'}</button></div></div>}
    {g.screen==='loading'&&<div className="fixed inset-0 z-40 grid place-items-center text-center p-6" style={{background:`radial-gradient(ellipse at 50% 80%,${lore.g},#0c0b0e 70%)`}}>
      <div className="max-w-md"><svg viewBox="0 0 200 120" className="w-56 mx-auto mb-6 opacity-70"><path d="M10 100h180M30 100V70q10-30 40-30t35 25l45 10v25M70 40q0-20 20-20t20 20" fill="none" stroke="#c9a45c" strokeWidth="1.5"/><circle cx="90" cy="44" r="3" fill="#c9a45c"/></svg>
        <p className="font-display text-3xl text-gold">{ar?lore.ar:lore.en}</p><div className="h-px bg-white/10 mt-8"><i className="block h-full bg-gold animate-[w_2.6s_linear]" style={{width:'100%'}}/></div>
        <p className="mt-5 italic text-white/50">{t('hint')[hint]}</p></div><style>{`@keyframes w{from{width:0}}`}</style></div>}
    {g.screen==='game'&&<Hud/>}
    {g.screen==='cutscene'&&<Subs/>}
    {g.screen==='end'&&<div className="fixed inset-0 z-50 bg-black grid place-items-center text-center"><div><h2 className="font-display text-4xl">{t('tbc')}</h2><button className="btn mt-8" onClick={()=>g.set({screen:'menu'})}>←</button></div></div>}
    {g.settingsOpen&&<Settings/>}
    {g.err&&<div className="fixed inset-0 z-[90] bg-black/90 grid place-items-center p-6 text-center"><div className="glass p-5 max-w-md"><p className="text-blood font-bold mb-2">{ar?'حدث خطأ':'Something went wrong'}</p><p className="text-xs text-white/60 break-words mb-4">{g.err}</p><button className="btn" onClick={()=>g.set({err:'',screen:'menu'})}>{ar?'العودة':'Back to menu'}</button></div></div>}
    {g.toast&&<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] glass !border-gold px-5 py-2">★ {t(g.toast)}</div>}
  </main>}
function Subs(){const t=useT();const [i,setI]=useState(-1);useEffect(()=>{const a=[setTimeout(()=>setI(0),5200),setTimeout(()=>setI(1),7000),setTimeout(()=>setI(2),9500)];return()=>a.forEach(clearTimeout)},[]);
  return <div className="fixed bottom-8 inset-x-0 text-center z-20 pointer-events-none"><span className="bg-black/50 px-4 py-2 rounded-xl text-lg">{i>=0&&t(['s1','s2','s3'][i])}</span></div>}
