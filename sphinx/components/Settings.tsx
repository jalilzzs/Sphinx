'use client';
import { useEffect, useState } from 'react';
import { useGame, PRESETS, DEFAULT_KEYS } from '@/lib/store';
import { applyVol, click } from '@/lib/audio';
type Tab='audio'|'graphics'|'controls'|'language';
export default function Settings(){
  const g=useGame();const ar=g.lang==='ar';const L=(e:string,a:string)=>ar?a:e;const [tab,setTab]=useState<Tab>('audio'),[bind,setBind]=useState<string|null>(null);
  useEffect(()=>{applyVol()},[g.master,g.bgm,g.sfx]);
  useEffect(()=>{if(!bind)return;const h=(e:KeyboardEvent)=>{e.preventDefault();e.stopPropagation();const k=e.key.toLowerCase();if(k!=='escape')g.set({keys:{...g.keys,[bind]:k}});setBind(null)};addEventListener('keydown',h,true);return()=>removeEventListener('keydown',h,true)},[bind,g.keys]);
  const Sl=({l,k,min=0,max=1,step=.01}:any)=><label className="block mb-4 text-sm text-white/60">{l} — {Math.round(((g as any)[k])*100)/100}<input type="range" className="w-full accent-[#c9a45c]" min={min} max={max} step={step} value={(g as any)[k]} onChange={e=>g.set({[k]:+e.target.value} as any)}/></label>;
  const Seg=({l,k,opts}:any)=><div className="mb-4 text-sm text-white/60">{l}<div className="flex gap-2 mt-1">{opts.map(([v,t]:any)=><button key={String(v)} className={`btn !py-2 flex-1 ${(g as any)[k]===v?'!border-gold bg-gold/20':''}`} onClick={()=>{click();k==='quality'?applyPreset(v):g.set({[k]:v} as any)}}>{t}</button>)}</div></div>;
  const tabs:[Tab,string][]=[['audio',L('Audio','الصوت')],['graphics',L('Graphics','الرسوميات')],['controls',L('Controls','التحكم')],['language',L('Language','اللغة')]];
  const names:any={fwd:L('Forward','أمام'),back:L('Back','خلف'),left:L('Left','يسار'),right:L('Right','يمين'),sprint:L('Sprint','ركض'),crouch:L('Crouch','انحناء'),light:L('Flashlight','المصباح'),phone:L('Phone','الهاتف'),inv:L('Inventory','الحقيبة'),act:L('Interact','تفاعل')};
  return <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-3" onPointerDown={e=>e.target===e.currentTarget&&g.set({settingsOpen:false})}>
   <div className="glass w-full max-w-lg max-h-[92vh] overflow-auto p-5"><div className="flex justify-between mb-3"><h3 className="font-display text-2xl">{L('Settings','الإعدادات')}</h3><button onClick={()=>g.set({settingsOpen:false})}>✕</button></div>
   <div className="flex gap-1 mb-5 overflow-x-auto">{tabs.map(([k,t])=><button key={k} onClick={()=>setTab(k)} className={`btn !py-2 !px-3 text-sm whitespace-nowrap ${tab===k?'!border-gold bg-gold/20':''}`}>{t}</button>)}</div>
   {tab==='audio'&&<><Sl l={L('Master','الصوت العام')} k="master"/><Sl l={L('Music (BGM)','الموسيقى')} k="bgm"/><Sl l={L('Effects (SFX)','المؤثرات')} k="sfx"/></>}
   {tab==='graphics'&&<><Seg l={L('Quality preset','مستوى الجودة')} k="quality" opts={[['low',L('Low','منخفضة')],['med',L('Med','متوسطة')],['high',L('High','عالية')]]}/>
     <Sl l={L('Resolution scale','دقة العرض')} k="res" min={.4} max={1.5} step={.05}/>
     <Seg l={L('Shadows','الظلال')} k="shadows" opts={[[true,L('On','تشغيل')],[false,L('Off','إيقاف')]]}/>
     <Seg l={L('Anti-aliasing','تنعيم الحواف')} k="aa" opts={[['none',L('Off','إيقاف')],['fxaa','FXAA'],['smaa','SMAA']]}/>
     <Seg l={L('Frame rate cap','حد الإطارات')} k="fps" opts={[[30,'30'],[60,'60'],[0,L('Unlimited','بلا حد')]]}/>
     <Seg l={L('Post-processing','المؤثرات اللاحقة')} k="post" opts={[[true,L('On','تشغيل')],[false,L('Off','إيقاف')]]}/>
     <p className="text-xs text-white/40">{L('Changing the preset applies its defaults; you can then tweak each option.','تغيير المستوى يطبّق إعداداته ثم يمكنك تعديل كل خيار.')}</p></>}
   {tab==='controls'&&<><h4 className="text-gold mb-2">{L('PC keybindings','مفاتيح الحاسوب')}</h4><div className="grid grid-cols-2 gap-2 mb-5">{Object.keys(DEFAULT_KEYS).map(k=><button key={k} className={`btn !py-2 text-sm flex justify-between ${bind===k?'!border-gold':''}`} onClick={()=>setBind(k)}><span>{names[k]}</span><kbd>{bind===k?'…':(g.keys as any)[k].toUpperCase()}</kbd></button>)}</div>
     <button className="btn !py-2 text-sm mb-6" onClick={()=>g.set({keys:{...DEFAULT_KEYS}})}>{L('Reset keys','استعادة الافتراضي')}</button>
     <h4 className="text-gold mb-2">{L('Mobile','الجوال')}</h4><Sl l={L('Touch UI scale','حجم أزرار اللمس')} k="uiScale" min={.7} max={1.5} step={.05}/><Sl l={L('Look sensitivity','حساسية النظر')} k="sens"/><Sl l={L('Touch responsiveness','استجابة اللمس')} k="touchResp" min={.5} max={2} step={.05}/></>}
   {tab==='language'&&<Seg l={L('Language','اللغة')} k="lang" opts={[['en','English'],['ar','العربية (فصحى)']]}/>}
  </div></div>}
export function applyPreset(q:'low'|'med'|'high'){useGame.getState().set({quality:q,...PRESETS[q]} as any)}
