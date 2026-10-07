'use client';
import { useEffect, useState } from 'react';
import { X, MessageCircle, Camera, Image as Img, NotebookPen, Flashlight, Phone as Ph, Save as Sv, Settings as St, ChevronLeft, Home } from 'lucide-react';
import { useGame } from '@/lib/store';
import { CHATS, GOALS, type Chat, type Msg } from '@/lib/phoneData';
import { PHOTOS, deletePhoto, clock, loadPhotos } from '@/lib/photo';
import { save } from '@/lib/saves';
import { ring, click, applyVol } from '@/lib/audio';
// ---- shared helpers (also used by the HUD for the unread badge + new-message notification)
export const visible=(c:Chat,inv:string[],fl:Record<string,boolean>)=>c.m.filter(m=>!m.req||inv.includes(m.req)||fl[m.req]);
export const unreadOf=(c:Chat,inv:string[],fl:Record<string,boolean>,read:Record<string,number>)=>visible(c,inv,fl).slice(read[c.id]||0).filter(m=>m.d==='in').length;
export const totalUnread=(inv:string[],fl:Record<string,boolean>,read:Record<string,number>)=>CHATS.reduce((n,c)=>n+unreadOf(c,inv,fl,read),0);
const EMERG=['122','17','112','911','999'];
type App=null|'messages'|'thread'|'gallery'|'photo'|'notes'|'call'|'settings';
export default function Phone({signal}:{signal:number}){
  const g=useGame();const ar=g.lang==='ar';const L=(e:string,a:string)=>ar?a:e;
  const [app,setApp]=useState<App>(null),[thread,setThread]=useState('nour'),[ph,setPh]=useState(0),[num,setNum]=useState(''),[line,setLine]=useState(''),[,tick]=useState(0);
  useEffect(()=>{loadPhotos();const id=setInterval(()=>tick(x=>x+1),5000);return()=>clearInterval(id)},[]);
  const close=()=>g.set({phoneOpen:false});const go=(a:App)=>{click();setApp(a)};
  const back=()=>setApp(app==='thread'?'messages':app==='photo'?'gallery':null);
  const call=(n:string)=>{setLine('');const emerg=EMERG.includes(n);
    if(!emerg&&signal===0){setApp('call');setLine(L('No service','لا توجد خدمة'));return}
    setLine(L('Calling…','جارٍ الاتصال…'));
    if(emerg){setTimeout(()=>setLine(L('Dispatcher: "Units dispatched, ETA 3 minutes."','المُرسِل: «تم إرسال الوحدات، الوصول خلال 3 دقائق.»')),1500);
      setTimeout(()=>{const S=useGame.getState(),A=S.lang==='ar';ring(4);S.say(A?'📞 رقم مجهول يتصل…':'📞 Restricted number calling…');
        setTimeout(()=>useGame.getState().say(A?'«لقد حذّرتك من مصيرها.»':'"I warned you about her fate."'),2200);
        setTimeout(()=>{const T=useGame.getState();T.say(A?'انقطعت المكالمة.':'Call lost.');T.unlock('ach_warn');useGame.setState({stamina:20})},5200)},15000)}
    else{ring(3);setTimeout(()=>setLine(L('No answer…','لا يوجد رد…')),3600)}};
  const vis=(c:Chat)=>visible(c,g.inventory,g.flags);
  const head=(t:string)=><div className="text-lg font-bold mb-3 text-gold">{t}</div>;
  return <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-3" onPointerDown={e=>e.target===e.currentTarget&&close()}>
   <div className="w-full max-w-[330px] h-[min(640px,88vh)] rounded-[34px] border-2 border-white/20 bg-[#0a090c] p-4 flex flex-col shadow-2xl">
    <div className="flex items-center justify-between text-xs text-white/60 px-1">
      <button aria-label="Close" onClick={close} className="w-10 h-10 -mt-1 -ms-2 grid place-items-center rounded-full bg-white/10 text-white"><X size={20}/></button>
      <span>{clock()}</span><span className={signal?'':'text-blood'}>{signal?'▂▄▆▇'.slice(0,signal+1):L('No service','لا توجد خدمة')} · 🔋41%</span></div>
    <div className="flex-1 overflow-auto mt-2 px-1">
     {app===null&&<><div className="text-center text-4xl font-light mt-4">{clock()}</div><div className="text-center text-xs text-white/40 mb-6">{signal?'':L('No service','لا توجد خدمة')}</div>
       <div className="grid grid-cols-3 gap-4">
        <div className="relative"><Row icon={<MessageCircle/>} label={L('Messages','الرسائل')} on={()=>go('messages')}/>{totalUnread(g.inventory,g.flags,g.read)>0&&<span className="absolute top-0 end-3 bg-blood rounded-full text-[10px] px-1.5">{totalUnread(g.inventory,g.flags,g.read)}</span>}</div>
        <Row icon={<Camera/>} label={L('Camera','الكاميرا')} on={()=>{close();g.set({camMode:true})}}/>
        <Row icon={<Img/>} label={L('Gallery','المعرض')} on={()=>go('gallery')}/>
        <Row icon={<NotebookPen/>} label={L('Notes','الملاحظات')} on={()=>go('notes')}/>
        <div className={g.light?'text-gold':''}><Row icon={<Flashlight/>} label={L('Flashlight','المصباح')} on={()=>g.set({light:!g.light})}/></div>
        <Row icon={<Ph/>} label={L('Phone','الهاتف')} on={()=>{setNum('');setLine('');go('call')}}/>
        <Row icon={<Sv/>} label={L('Save','حفظ')} on={()=>{save();g.say(L('Progress saved.','تم حفظ التقدم.'))}}/>
        <Row icon={<St/>} label={L('Settings','الإعدادات')} on={()=>go('settings')}/></div></>}
     {app==='messages'&&<>{head(L('Messages','الرسائل'))}{CHATS.filter(c=>vis(c).length).map(c=>{const v=vis(c),last=v[v.length-1],un=unreadOf(c,g.inventory,g.flags,g.read);const trailing=(()=>{let n=0;for(let i=v.length-1;i>=0&&v[i].d==='out';i--)n++;return n})();
        return <button key={c.id} className={`w-full flex gap-3 items-center py-3 border-b border-white/10 text-start ${c.id==='nour'?'border-s-4 border-s-gold ps-2 bg-gold/5':''}`} onClick={()=>{setThread(c.id);g.set({read:{...g.read,[c.id]:v.length}});go('thread')}}>
          <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center">{c.icon}</div><div className="flex-1 min-w-0"><b className="block text-sm">{ar?c.ar:c.en}{c.id==='nour'?' 📌':''}</b><span className="block text-xs text-white/50 truncate">{ar?last.ar:last.en}</span></div>
          {un>0?<span className="bg-blood rounded-full text-xs px-2">{un}</span>:trailing>3?<span className="text-[10px] text-white/40">{trailing} · {L('Delivered','تم التسليم')}</span>:null}</button>})}</>}
     {app==='thread'&&(()=>{const c=CHATS.find(x=>x.id===thread)!;const v=vis(c);return <>{head(ar?c.ar:c.en)}
        <button className="btn !py-1 !px-3 text-xs mb-3" onClick={()=>call(c.id)}>{L('Call','اتصال')} ☎</button>
        {v.map((m:Msg,i)=><div key={i}>{m.st&&<div className="text-center text-[10px] text-white/30 my-2">{ar?m.st[1]:m.st[0]}</div>}<div className={`max-w-[82%] my-1 px-3 py-2 rounded-2xl text-sm ${m.d==='out'?'ms-auto bg-[#3a2f1a]':'bg-[#2a2730]'}`}>{ar?m.ar:m.en}{m.d==='out'&&i===v.length-1&&<small className="block text-[10px] text-white/40">{L('Delivered ✓✓','تم التسليم ✓✓')}</small>}</div></div>)}</>})()}
     {app==='gallery'&&<>{head(L('Gallery','المعرض')+' ('+PHOTOS.length+')')}{!PHOTOS.length&&<p className="text-white/40 text-sm">{L('No photos yet. Use the camera on clues.','لا صور بعد. استخدم الكاميرا على الأدلة.')}</p>}
        <div className="grid grid-cols-3 gap-1">{PHOTOS.map((p,i)=><img key={i} src={p.d} alt="" className="w-full aspect-square object-cover rounded" onClick={()=>{setPh(i);go('photo')}}/>)}</div></>}
     {app==='photo'&&PHOTOS[ph]&&<><img src={PHOTOS[ph].d} alt="" className="w-full rounded"/><div className="flex gap-2 mt-3"><a className="btn !py-2 text-sm flex-1 text-center" href={PHOTOS[ph].d} download={`sphinx_${ph+1}.jpg`}>{L('Download','تنزيل')}</a><button className="btn !py-2 text-sm flex-1" onClick={()=>{deletePhoto(ph);setApp('gallery')}}>{L('Delete','حذف')}</button></div></>}
     {app==='notes'&&<>{head(L('Notes','الملاحظات'))}<p className="text-xs text-white/40">{L('Current goal','الهدف الحالي')}</p><p className="mb-4">{(GOALS[g.scene]||['',''])[ar?1:0]}</p><p className="text-xs text-white/40">{L('Photos','الصور')}: {PHOTOS.length} · {L('Items','العناصر')}: {g.inventory.length}</p></>}
     {app==='call'&&<>{head(L('Phone','الهاتف'))}<div className="text-center text-2xl tracking-[.2em] min-h-[2.2rem]">{num}</div><p className="text-center text-sm text-gold min-h-[1.5rem]">{line}</p>
        <div className="grid grid-cols-3 gap-2 mt-2">{'123456789*0#'.split('').map(d=><button key={d} className="btn !py-3 text-lg" onClick={()=>num.length<8&&setNum(num+d)}>{d}</button>)}</div>
        <div className="flex gap-2 mt-3"><button className="btn flex-1 !border-[#2c6a45] bg-[#2c6a45]/30" onClick={()=>num&&call(num)}>{L('Call','اتصال')}</button><button className="btn !px-4" onClick={()=>setNum(num.slice(0,-1))}>⌫</button></div>
        <div className="flex gap-2 mt-2"><button className="btn flex-1 !py-2 text-sm" onClick={()=>call('nour')}>♥ {L('Nour','نور')}</button><button className="btn flex-1 !py-2 text-sm" onClick={()=>call('mom')}>☾ {L('Mom','أمي')}</button></div></>}
     {app==='settings'&&<>{head(L('Settings','الإعدادات'))}<p className="text-xs text-white/40">{L('Language','اللغة')}</p><div className="flex gap-2 my-2"><button className={`btn flex-1 !py-2 ${!ar?'!border-gold':''}`} onClick={()=>g.set({lang:'en'})}>English</button><button className={`btn flex-1 !py-2 ${ar?'!border-gold':''}`} onClick={()=>g.set({lang:'ar'})}>العربية</button></div>
        <p className="text-xs text-white/40 mt-4">{L('Volume','الصوت')}</p><input type="range" className="w-full accent-[#c9a45c]" min={0} max={1} step={.01} value={g.master} onChange={e=>{g.set({master:+e.target.value});applyVol()}}/>
        <button className="btn w-full mt-4 text-sm" onClick={()=>{close();g.set({settingsOpen:true})}}>{L('All settings','كل الإعدادات')}</button></>}
    </div>
    <div className="flex justify-center gap-6 pt-2 border-t border-white/10 mt-2">
      <button aria-label="Back" className="w-11 h-11 grid place-items-center rounded-full bg-white/10 disabled:opacity-30" disabled={!app} onClick={back}><ChevronLeft/></button>
      <button aria-label="Home" className="w-11 h-11 grid place-items-center rounded-full bg-white/10" onClick={()=>setApp(null)}><Home size={20}/></button>
      <button aria-label="Close" className="w-11 h-11 grid place-items-center rounded-full bg-blood/60" onClick={close}><X size={20}/></button></div>
   </div></div>}

function Row({icon,label,on}:{icon:any;label:string;on:()=>void}){return <button onClick={on} className="flex flex-col items-center gap-1 text-xs"><div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">{icon}</div>{label}</button>}
