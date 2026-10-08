'use client';
import { useState } from 'react';
import { useGame } from '@/lib/store';
import { PUZ } from '@/lib/puzzles';
import { solveCode, closeCard } from '@/lib/engine';
import { click } from '@/lib/audio';

// Narrative UI layer: monologue line, paper notes, keypad lock, cinematic bars, power-on flicker.
export default function Overlays() {
  const g = useGame(); const ar = g.lang === 'ar';
  return <>
    <style>{`@keyframes monoIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes flick{0%{opacity:.85}8%{opacity:0}14%{opacity:.65}22%{opacity:0}30%{opacity:.4}100%{opacity:0}}
    @keyframes barIn{from{transform:translateY(var(--from))}to{transform:none}}
    @keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    {g.bars && <><div className="fixed top-0 inset-x-0 h-[11vh] bg-black z-[26] pointer-events-none" style={{ animation: 'barIn .5s ease both', ['--from' as any]: '-100%' }} />
      <div className="fixed bottom-0 inset-x-0 h-[11vh] bg-black z-[26] pointer-events-none" style={{ animation: 'barIn .5s ease both', ['--from' as any]: '100%' }} /></>}
    {g.flash > 0 && <div key={g.flash} className="fixed inset-0 z-[24] pointer-events-none bg-white" style={{ animation: 'flick 1.6s ease-out forwards' }} />}
    {g.mono && !g.card && !g.lock && <div key={g.monoId} className="fixed inset-x-0 bottom-[17%] z-[25] flex justify-center px-6 pointer-events-none">
      <p className="max-w-md text-center italic text-[#eadfce] text-[15px] leading-relaxed" style={{ textShadow: '0 2px 12px #000', animation: 'monoIn .6s ease both' }}>“{g.mono}”</p></div>}
    {g.card && <Note ar={ar} />}
    {g.lock && <Keypad ar={ar} />}
  </>;
}

function Note({ ar }: { ar: boolean }) {
  const g = useGame(); const p = (PUZ[g.scene] || []).find(x => x.id === g.card!.id); if (!p?.note) return null;
  return <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-5" onClick={closeCard}>
    <div className="w-full max-w-sm rounded-sm p-6 shadow-2xl" style={{ background: '#e6d8b8', color: '#2a2118', transform: 'rotate(-1deg)', fontFamily: "'Amiri','Cormorant Garamond',serif" }}>
      <h3 className="text-xl font-bold mb-3 border-b border-[#2a2118]/30 pb-1">{ar ? p.note.title.ar : p.note.title.en}</h3>
      <p className="text-lg whitespace-pre-line leading-relaxed">{ar ? p.note.text.ar : p.note.text.en}</p>
      <p className="text-xs mt-4 opacity-50 text-center">{ar ? 'المس للإغلاق' : 'tap to close'}</p></div></div>;
}

function Keypad({ ar }: { ar: boolean }) {
  const g = useGame(); const p = (PUZ[g.scene] || []).find(x => x.id === g.lock!.id)!; const len = g.lock!.len;
  const [v, setV] = useState(''), [bad, setBad] = useState(0);
  const press = (d: string) => {
    if (v.length >= len) return; click();
    const n = v + d; setV(n);
    if (n.length === len) setTimeout(() => { if (!solveCode(p, n)) { setBad(Date.now()); setV(''); } }, 180);
  };
  return <div className="fixed inset-0 z-[60] bg-black/75 grid place-items-center p-4" onPointerDown={e => e.target === e.currentTarget && useGame.setState({ lock: null })}>
    <div className="glass p-5 w-full max-w-[260px] text-center">
      <p className="text-sm text-gold mb-3">{ar ? p.ar : p.en}</p>
      <div key={bad} className="flex justify-center gap-2 mb-4" style={bad ? { animation: 'shake .4s' } : undefined}>
        {Array.from({ length: len }, (_, i) => <div key={i} className="w-10 h-12 rounded bg-black/50 border border-white/15 grid place-items-center text-2xl text-bone">{v[i] ?? ''}</div>)}</div>
      <div className="grid grid-cols-3 gap-2">{'123456789'.split('').map(d => <button key={d} className="btn !py-3 text-lg" onClick={() => press(d)}>{d}</button>)}
        <button className="btn !py-3" onClick={() => setV('')}>⌫</button><button className="btn !py-3 text-lg" onClick={() => press('0')}>0</button>
        <button className="btn !py-3" onClick={() => useGame.setState({ lock: null })}>✕</button></div></div></div>;
}
