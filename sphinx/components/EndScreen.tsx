'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { stopEndingMusic } from '@/lib/audio';

// The closing card: black screen, two quiet lines, the title, "to be continued", and a way back to the menu once the music has settled.
export default function EndScreen() {
  const t = useT(); const ar = useGame(s => s.lang === 'ar');
  const [btn, setBtn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setBtn(true), 9000); return () => clearTimeout(id); }, []);
  const back = () => { stopEndingMusic(); useGame.setState({ screen: 'menu' }); };
  const L = (d: number, extra = ''): React.CSSProperties => ({ opacity: 0, animation: `endIn 2.4s ease ${d}s forwards`, ...(extra ? { letterSpacing: extra } : {}) });
  return (
    <div className="fixed inset-0 z-[95] bg-black grid place-items-center text-center px-6 overflow-hidden">
      <style>{`@keyframes endIn{from{opacity:0;transform:translateY(8px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
      @keyframes drift{from{transform:translateY(0);opacity:0}20%{opacity:.5}to{transform:translateY(-110vh);opacity:0}}`}</style>
      {Array.from({ length: 14 }, (_, i) => <i key={i} className="absolute rounded-full bg-[#cfe3ff]" style={{ width: 2 + (i % 3), height: 2 + (i % 3), left: `${(i * 37) % 100}%`, bottom: '-4vh', animation: `drift ${14 + (i % 5) * 3}s linear ${i * 1.3}s infinite`, opacity: 0 }} />)}
      <div className="max-w-md relative">
        <p className="text-lg text-[#d9cfbe] italic mb-3" style={L(0.8)}>{ar ? 'كانت هناك.' : 'She was there.'}</p>
        <p className="text-lg text-[#d9cfbe] italic mb-12" style={L(3.4)}>{ar ? 'ثم لم تعد.' : 'And then she was not.'}</p>
        <h1 className="font-display text-5xl text-gold" style={L(6.4, ar ? '0' : '.3em')}>SPHINX</h1>
        <p className="mt-4 text-sm text-white/55" style={L(8.2)}>{t('tbc')}</p>
        {btn && <button className="btn mt-10" style={{ animation: 'endIn 1.6s ease both' }} onClick={back}>{ar ? 'العودة إلى القائمة' : 'Back to menu'}</button>}
      </div>
    </div>
  );
}
