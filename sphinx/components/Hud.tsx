'use client';
import { useRef } from 'react';
import { Zap, ChevronDown, Lightbulb, Smartphone, Backpack, DoorOpen } from 'lucide-react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { SCENES } from '@/lib/scenes';
import Phone from './Phone';

export default function Hud({onNext}:{onNext:()=>void}){
  const g=useGame();const t=useT();const R=96,knob=useRef<HTMLDivElement>(null),act=useRef(false);
  const mv=(e:React.PointerEvent)=>{const r=(e.currentTarget as HTMLElement).getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy);if(m>R*.6){dx*=R*.6/m;dy*=R*.6/m}
    if(knob.current)knob.current.style.transform=`translate(${dx}px,${dy}px)`;g.set({move:{x:dx/(R*.6),y:dy/(R*.6)}})};
  const B=({on,onClick,children}:any)=><button onClick={onClick} className={`glass w-14 h-14 grid place-items-center ${on?'!border-gold text-gold bg-gold/20':''}`}>{children}</button>;
  return <>
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_45%,rgba(0,0,0,.8))]"/>
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 w-36 text-center pointer-events-none"><svg viewBox="0 0 140 60"><path d="M10 52Q70-14 130 52" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" strokeLinecap="round"/><path d="M10 52Q70-14 130 52" fill="none" stroke={g.stamina<25?'#a8423b':'#c9a45c'} strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray={`${g.stamina} 100`}/></svg><div className="text-xs text-white/50 -mt-2">{t('stamina')}</div></div>
    <div className="fixed end-4 z-20 flex flex-col gap-3" style={{bottom:'calc(env(safe-area-inset-bottom) + 160px)'}}>
      <B onClick={()=>g.set({phoneOpen:!g.phoneOpen})}><Smartphone/></B><B onClick={()=>g.set({invOpen:!g.invOpen})}><Backpack/></B><B onClick={onNext}><DoorOpen/></B></div>
    {g.touch?<>
      <div className="fixed start-6 z-20 w-36 h-36 rounded-full glass touch-none" style={{bottom:'calc(env(safe-area-inset-bottom) + 28px)'}}
        onPointerDown={e=>{act.current=true;e.currentTarget.setPointerCapture(e.pointerId);mv(e)}} onPointerMove={e=>act.current&&mv(e)}
        onPointerUp={()=>{act.current=false;if(knob.current)knob.current.style.transform='';g.set({move:{x:0,y:0}})}}>
        <div ref={knob} className="absolute top-1/2 left-1/2 -ml-8 -mt-8 w-16 h-16 rounded-full bg-gradient-to-br from-[#e8cd8f] to-[#7a6030]"/></div>
      <div className="fixed end-4 z-20 grid grid-cols-3 gap-3" style={{bottom:'calc(env(safe-area-inset-bottom) + 28px)'}}>
        <B on={g.sprint} onClick={()=>g.set({sprint:!g.sprint})}><Zap/></B><B on={g.crouch} onClick={()=>g.set({crouch:!g.crouch})}><ChevronDown/></B><B on={g.light} onClick={()=>g.set({light:!g.light})}><Lightbulb/></B></div>
    </>:<div className="fixed bottom-4 start-4 text-xs text-white/50 leading-7"><kbd>WASD</kbd> · <kbd>Shift</kbd> · <kbd>C</kbd> · <kbd>F</kbd> · <kbd>P</kbd> · <kbd>I</kbd></div>}
    {g.phoneOpen&&<Phone signal={SCENES[g.scene].signal}/>}
  </>}
