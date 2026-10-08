'use client';
import { useRef, useState } from 'react';
import { Zap, ChevronDown, Lightbulb, Smartphone, Backpack, Pause, Hand } from 'lucide-react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { SCENES } from '@/lib/scenes';
import { autosave, save } from '@/lib/saves';
import Overlays from './Overlays';
import Phone, { totalUnread, visible } from './Phone';
import { CHATS } from '@/lib/phoneData';
import { takePhoto } from '@/lib/photo';
import { useEffect } from 'react';
import { X as XI } from 'lucide-react';
import { ring } from '@/lib/audio';
import Inventory from './Inventory';
export default function Hud(){
  const g=useGame();const t=useT();const ar=g.lang==='ar',R=96,knob=useRef<HTMLDivElement>(null),act=useRef(false);
  const mv=(e:React.PointerEvent)=>{const r=(e.currentTarget as HTMLElement).getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy),M=R*.6*g.uiScale;if(m>M){dx*=M/m;dy*=M/m}
    if(knob.current)knob.current.style.transform=`translate(${dx}px,${dy}px)`;g.set({move:{x:dx/M,y:dy/M}})};
  const un=totalUnread(g.inventory,g.flags,g.read);const [seen,setSeen]=useState<number|null>(null);
  useEffect(()=>{const n=CHATS.reduce((a,c)=>a+visible(c,g.inventory,g.flags).length,0);if(seen!==null&&n>seen){ring(1);g.say(g.lang==='ar'?'📱 رسالة جديدة':'📱 New message');try{navigator.vibrate?.([80,60,80])}catch{}}setSeen(n)},[g.inventory,g.flags]);
  const sc={transform:`scale(${g.uiScale})`};const pause=()=>{g.set({pauseOpen:true,sprint:false,move:{x:0,y:0}});autosave()};
  return <>
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_45%,rgba(0,0,0,.8))]"/>
    <button className="fixed top-3 start-3 z-30 glass w-12 h-12 grid place-items-center" aria-label="Pause" onClick={pause}><Pause size={20}/></button>
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 w-36 text-center pointer-events-none"><svg viewBox="0 0 140 60"><path d="M10 52Q70-14 130 52" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" strokeLinecap="round"/><path d="M10 52Q70-14 130 52" fill="none" stroke={g.stamina<25?'#a8423b':'#c9a45c'} strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray={`${g.stamina} 100`}/></svg><div className="text-xs text-white/50 -mt-2">{t('stamina')}</div></div>
    {g.prompt&&<div className="fixed bottom-[34%] left-1/2 -translate-x-1/2 z-20 glass px-4 py-2 text-sm pointer-events-none">{g.prompt} <kbd className="ms-2 text-gold">{g.touch?'✋':g.keys.act.toUpperCase()}</kbd></div>}
    {g.note&&<div className="fixed bottom-24 inset-x-0 text-center z-20 pointer-events-none"><span className="bg-black/60 px-4 py-2 rounded-xl">{g.note}</span></div>}
    <div className="fixed end-4 z-20 flex flex-col gap-3 origin-bottom-right" style={{bottom:'calc(env(safe-area-inset-bottom) + 160px)',...sc}}><div className="relative"><B on={un>0} onClick={()=>g.set({phoneOpen:!g.phoneOpen})}><Smartphone/></B>{un>0&&<span className="absolute -top-1 -end-1 bg-blood rounded-full text-[11px] px-1.5">{un}</span>}</div><B onClick={()=>g.set({invOpen:true})}><Backpack/></B></div>
    {g.touch?<>
      <div className="fixed start-6 z-20 w-36 h-36 rounded-full glass touch-none origin-bottom-left" style={{bottom:'calc(env(safe-area-inset-bottom) + 28px)',...sc}} onPointerDown={e=>{act.current=true;e.currentTarget.setPointerCapture(e.pointerId);mv(e)}} onPointerMove={e=>act.current&&mv(e)} onPointerUp={()=>{act.current=false;if(knob.current)knob.current.style.transform='';g.set({move:{x:0,y:0}})}}>
        <div ref={knob} className="absolute top-1/2 left-1/2 -ml-8 -mt-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#e8cd8f] to-[#7a6030]"/></div>
      <div className="fixed end-4 z-20 grid grid-cols-2 gap-3 origin-bottom-right" style={{bottom:'calc(env(safe-area-inset-bottom) + 28px)',...sc}}>
        <B on={g.sprint} onClick={()=>g.set({sprint:!useGame.getState().sprint})}><Zap/></B><B on={g.crouch} onClick={()=>g.set({crouch:!g.crouch})}><ChevronDown/></B><B on={g.light} onClick={()=>g.set({light:!g.light})}><Lightbulb/></B><B onClick={()=>g.set({actReq:Date.now()})}><Hand/></B></div>
    </>:<div className="fixed bottom-4 start-4 text-xs text-white/50">{Object.entries(g.keys).map(([k,v])=><kbd key={k} className="me-2">{v.toUpperCase()}</kbd>)}</div>}
    {g.camMode&&<div className="fixed inset-0 z-[60] pointer-events-none"><div className="absolute inset-[12%_14%_22%] border border-white/50"/><button className="pointer-events-auto absolute top-3 end-3 glass w-12 h-12 grid place-items-center" onClick={()=>g.set({camMode:false})}><XI/></button><button aria-label="Shutter" className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-bone bg-white/20 active:scale-90" onClick={()=>takePhoto()}/></div>}
    <Overlays/>
    {g.phoneOpen&&<Phone signal={SCENES[g.scene].signal}/>}
    {g.invOpen&&<Inventory/>}
    {g.pauseOpen&&<div className="fixed inset-0 z-[55] bg-black/70 grid place-items-center p-4"><div className="glass p-6 w-full max-w-xs flex flex-col gap-3"><h3 className="font-display text-3xl text-center">{ar?'إيقاف مؤقت':'Paused'}</h3>
      <button className="btn !border-gold" onClick={()=>g.set({pauseOpen:false})}>{ar?'استئناف':'Resume game'}</button>
      <button className="btn" onClick={()=>g.set({settingsOpen:true})}>{ar?'الإعدادات':'Settings'}</button>
      <button className="btn text-sm opacity-60" onClick={()=>g.set({pauseOpen:false,exitReq:Date.now()})}>{ar?'تخطي الفصل (اختبار)':'Skip chapter (test)'}</button>
      <button className="btn" onClick={async()=>{await save();g.set({pauseOpen:false,phoneOpen:false,invOpen:false,screen:'menu'})}}>{ar?'الخروج إلى القائمة':'Exit to main menu'}</button></div></div>}
  </>}

function B({on,onClick,children}:any){return <button onClick={onClick} className={`glass w-14 h-14 grid place-items-center ${on?'!border-gold text-gold bg-gold/20':''}`}>{children}</button>}
