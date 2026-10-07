'use client';
import { useState } from 'react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { PUZ } from '@/lib/puzzles';
import { world } from '@/lib/world';
import { ring } from '@/lib/audio';
import { autosave } from '@/lib/saves';
import * as THREE from 'three';
import { puzzlePos } from './Interactables';
// Phase-1 phone: signal gauge, Nour thread, camera shutter, emergency-call easter egg. Extend with more apps/threads.
export default function Phone({signal}:{signal:number}){
  const g=useGame();const t=useT();const [app,setApp]=useState<'home'|'msgs'|'cam'|'call'>('home');const [line,setLine]=useState('');
  const call=()=>{setApp('call');setLine('📞 …');setTimeout(()=>setLine(g.lang==='ar'?'تم إرسال الوحدات، الوصول خلال 3 دقائق.':'Units dispatched, ETA 3 minutes.'),1500);
    setTimeout(()=>{ring(4);setLine(g.lang==='ar'?'رقم مجهول…':'Restricted number…');setTimeout(()=>setLine(g.lang==='ar'?'لقد حذّرتك من مصيرها.':'I warned you about her fate.'),1500);
      setTimeout(()=>{setLine('—');g.unlock('ach_warn');g.set({stamina:20})},4000)},15000)};
  const shoot=()=>{const cam=world.cam;if(!cam)return;const d=new THREE.Vector3();cam.getWorldDirection(d);
    const hit=(PUZ[g.scene]||[]).find(p=>{if(!p.photo)return false;const v=puzzlePos(p.off,p.kind).sub(cam.position);return v.length()<7&&v.normalize().dot(d)>.8});
    if(hit){g.set({flags:{...g.flags,['ph_'+hit.id]:true}});g.unlock('ach_photo2');g.say(g.lang==='ar'?hit.txtAr!:hit.txtEn!);autosave()}else g.say(g.lang==='ar'?'لا شيء مهم هنا.':'Nothing of note here.')};
  return <div className="fixed z-40 bottom-3 end-3 w-[min(330px,92vw)] h-[min(620px,86vh)] rounded-[34px] border-2 border-white/15 bg-[#0a090c] p-4 flex flex-col">
    <div className="flex justify-between text-xs text-white/50 px-2"><button className="text-white/80 text-lg px-2 -mt-1" aria-label="Close" onClick={()=>g.set({phoneOpen:false})}>✕</button><span>21:47</span><span>{signal===0?t('noSvc'):'▂▄▆'.slice(0,signal)}</span></div>
    {app!=='home'&&<button className="text-start mt-2" onClick={()=>setApp('home')}>‹</button>}
    {app==='home'&&<div className="grid grid-cols-3 gap-3 mt-6 text-sm text-center">{(['msgs','cam','call'] as const).map(a=><button key={a} className="btn !p-4" onClick={()=>a==='call'?setApp('call'):setApp(a)}>{a==='msgs'?'✉':a==='cam'?'◉':'☎'}</button>)}</div>}
    {app==='msgs'&&<div className="mt-3 text-sm"><div className="border-s-4 border-gold bg-gold/5 p-3 rounded"><b>Nour 📌</b> <span className="bg-blood rounded-full px-2 text-xs ms-2">47</span><p className="text-white/50 mt-1">{g.lang==='ar'?'لا تذهب إلى المتحف.':"Don't go to the museum."} · Delivered ✓✓</p></div></div>}
    {app==='cam'&&<div className="flex-1 relative mt-3 bg-black rounded-2xl grid place-items-end justify-center pb-4"><div className="absolute inset-[14%_10%_24%] border border-white/50"/><button className="w-16 h-16 rounded-full border-4 border-bone" onClick={shoot}/></div>}
    {app==='call'&&<div className="mt-6 text-center"><button className="btn w-full" onClick={call}>☎ 122</button><p className="mt-6 text-lg">{line}</p></div>}
  </div>}
