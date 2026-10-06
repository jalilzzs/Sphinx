'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { supabase, signInGoogle, signOut } from '@/lib/supabase';
import { save, load } from '@/lib/saves';
import { ORDER } from '@/lib/scenes';
import GameCanvas from './GameCanvas';
import Hud from './Hud';

export default function Game(){
  const g=useGame();const t=useT();const [hint,setHint]=useState(0);
  useEffect(()=>{g.set({touch:matchMedia('(pointer:coarse)').matches});
    document.documentElement.dir=g.lang==='ar'?'rtl':'ltr';
    const apply=(u:any)=>g.set({user:u?{id:u.id,name:u.user_metadata?.full_name||u.email?.split('@')[0]||'Player',avatar:u.user_metadata?.avatar_url}:null});
    supabase.auth.getSession().then(r=>apply(r.data.session?.user));
    const {data}=supabase.auth.onAuthStateChange((_,s)=>apply(s?.user));return()=>data.subscription.unsubscribe()},[]);
  useEffect(()=>{document.documentElement.dir=g.lang==='ar'?'rtl':'ltr'},[g.lang]);
  const enter=(scene:string)=>{setHint(Math.floor(Math.random()*3));g.set({screen:'loading',scene});setTimeout(()=>g.set({screen:'game'}),1800)};
  const nextScene=()=>{const i=ORDER.indexOf(g.scene);const n=ORDER[Math.min(ORDER.length-1,i+1)];save();n===ORDER[ORDER.length-1]?(g.set({scene:n,screen:'loading'}),setTimeout(()=>g.set({screen:'cutscene'}),1800)):enter(n)};
  const inGame=g.screen==='game'||g.screen==='cutscene';
  return <main className="fixed inset-0">
    {(inGame||g.screen==='end')&&<GameCanvas/>}
    <div className="fixed top-3 end-3 z-30 glass flex items-center gap-2 ps-4 pe-1.5 py-1.5 cursor-pointer" onClick={()=>g.user?signOut():signInGoogle()}>
      <span className="text-sm">{g.user?g.user.name:t('login')}</span>
      <div className="w-8 h-8 rounded-full bg-gold text-ink grid place-items-center font-bold">{g.user?.avatar?<img src={g.user.avatar} className="rounded-full"/>:(g.user?.name[0]||'?')}</div></div>
    {g.screen==='splash'&&<div onClick={()=>g.set({screen:'menu'})} className="fixed inset-0 grid place-items-center text-center cursor-pointer bg-[radial-gradient(ellipse_at_50%_110%,#2b2417,#0c0b0e_65%)]">
      <div><h1 className="font-display text-[clamp(3.5rem,15vw,9rem)] tracking-[.3em] text-bone">SPHINX</h1><p className="mt-8 text-white/50 animate-pulse">{t('tap')}</p></div></div>}
    {g.screen==='menu'&&<div className="fixed inset-0 grid place-items-center p-4 bg-[radial-gradient(ellipse_at_20%_0,#14262a,#0c0b0e_60%)]"><div className="glass p-6 w-full max-w-sm flex flex-col gap-3">
      <h2 className="font-display text-4xl text-center tracking-widest">SPHINX</h2>
      <button className="btn !border-gold font-bold" onClick={()=>enter('bathroom_interior')}>{t('start')}</button>
      <button className="btn" onClick={async()=>{if(await load())enter(useGame.getState().scene)}}>{t('cont')}</button>
      <div className="grid grid-cols-3 gap-2 text-sm"><button className="btn !px-2" onClick={()=>g.set({lang:g.lang==='en'?'ar':'en'})}>{g.lang==='en'?'العربية':'English'}</button>
        <button className="btn !px-2" onClick={()=>g.set({quality:g.quality==='low'?'med':g.quality==='med'?'high':'low'})}>{t('quality')}: {g.quality}</button>
        <button className="btn !px-2" onClick={()=>g.set({sens:g.sens>.9?.2:g.sens+.2})}>Sens {Math.round(g.sens*10)}</button></div></div></div>}
    {g.screen==='loading'&&<div className="fixed inset-0 z-40 bg-ink grid place-items-center text-center p-6"><div><p className="font-display text-3xl text-gold">{t('loading')}…</p><p className="mt-4 italic text-white/50 max-w-sm">{t('hint')[hint]}</p></div></div>}
    {g.screen==='game'&&<Hud onNext={nextScene}/>}
    {g.screen==='cutscene'&&<Subs/>}
    {g.screen==='end'&&<div className="fixed inset-0 z-50 bg-black grid place-items-center text-center"><div><h2 className="font-display text-4xl">{t('tbc')}</h2><button className="btn mt-8" onClick={()=>g.set({screen:'menu'})}>←</button></div></div>}
    {g.toast&&<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] glass !border-gold px-5 py-2">★ {t(g.toast)}</div>}
  </main>}
function Subs(){const t=useT();const [i,setI]=useState(-1);useEffect(()=>{const a=[setTimeout(()=>setI(0),5200),setTimeout(()=>setI(1),7000),setTimeout(()=>setI(2),9500)];return()=>a.forEach(clearTimeout)},[]);
  return <div className="fixed bottom-8 inset-x-0 text-center z-20 pointer-events-none"><span className="bg-black/50 px-4 py-2 rounded-xl text-lg">{i>=0&&t(['s1','s2','s3'][i])}</span></div>}
