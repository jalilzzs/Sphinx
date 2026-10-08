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
import EndScreen from './EndScreen';
import { finishEnding } from '@/lib/ending';

export default function Game(){
  const t = useT();
  const screen = useGame(s => s.screen);
  const scene = useGame(s => s.scene);
  const lang = useGame(s => s.lang);
  const user = useGame(s => s.user);
  const exitReq = useGame(s => s.exitReq);
  const settingsOpen = useGame(s => s.settingsOpen);
  const err = useGame(s => s.err);
  const toast = useGame(s => s.toast);
  const achievements = useGame(s => s.achievements);

  const ar = lang === 'ar';
  const [hint, setHint] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false); // opens the profile / achievements panel (instead of signing out)
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    useGame.setState({ touch: matchMedia('(pointer:coarse)').matches });
    const apply = (u: any) => useGame.setState({ user: u ? { id: u.id, name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Player', avatar: u.user_metadata?.avatar_url } : null });
    supabase.auth.getSession().then(r => apply(r.data.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_, s) => apply(s?.user));
    // mobile: block pull-to-refresh / page scroll while moving the camera (scrollable panels still scroll)
    const guard = (e: TouchEvent) => {
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', guard, { passive: false });
    const unlock = () => { unlockAudio(); applyVol(); };
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener('touchmove', guard);
      ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => removeEventListener(ev, unlock));
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, ar]);

  const enter = (nextScene: string, then: 'game' | 'cutscene' = 'game', kind: 'intro' | 'ending' = 'intro') => {
    useGame.setState({ cutscene: kind, fade: 0, sub: '', bars: false, 
      err: '', 
      phoneOpen: false, 
      invOpen: false, 
      prompt: '',
      screen: 'loading', 
      scene: nextScene,
      targetScreen: then 
    });
    setHint(Math.floor(Math.random() * 3));

    setTimeout(() => {
      const s = useGame.getState();
      if (s.screen === 'loading') {
        useGame.setState({ screen: then });
        autosave();
      }
    }, 2000);
  };

  useEffect(() => {
    if (!exitReq) return;
    useGame.setState({ exitReq: false });
    const i = ORDER.indexOf(scene);
    if (i < 0 || i >= ORDER.length - 1) enter(scene, 'cutscene', 'ending');   // last chapter -> the official ending
    else enter(ORDER[i + 1]);
  }, [exitReq, scene]);

  const inGame = screen === 'game' || screen === 'cutscene' || screen === 'loading';
  const lore = LORE[scene] || { ar: 'المستودع المهجور', en: 'Abandoned Warehouse', g: '#14262a' };

  return (
    <main className="fixed inset-0 overflow-hidden select-none touch-none overscroll-none" style={{ touchAction: 'none', overscrollBehavior: 'none', height: '100dvh' }}>
      {inGame && <GameCanvas />}
      
      {/* زر الحساب: إذا كان مسجلاً يفتح لوحة البروفايل، وإذا لم يكن مسجلاً يبدأ تسجيل الدخول بـ Google */}
      {!inGame && screen !== 'end' && (
        <div className="fixed top-3 end-3 z-30 glass flex items-center gap-2 ps-4 pe-1.5 py-1.5 cursor-pointer" onClick={() => { if (user) { setNameDraft(user.name); setProfileOpen(true); } else signInGoogle(); }}>
          <span className="text-sm">{user ? user.name : t('login')}</span>
          <div className="w-8 h-8 rounded-full bg-gold text-ink grid place-items-center font-bold overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || '?')}
          </div>
        </div>
      )}

      {/* لوحة البروفايل والإنجازات (تفتح عند الضغط على الكونكونت بدل عمل Sign out) */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 backdrop-blur-sm">
          <div className="glass p-6 w-full max-w-sm flex flex-col gap-4 text-center">
            <h3 className="font-display text-2xl text-gold">{ar ? 'ملف اللاعب' : 'Player Profile'}</h3>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gold text-ink grid place-items-center font-bold text-2xl overflow-hidden border-2 border-gold">
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || '?')}
              </div>
              <p className="font-bold text-lg text-bone">{user?.name}</p>
            </div>
            
            <input className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-center text-sm text-bone select-text" value={nameDraft} maxLength={24}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={() => { const n = nameDraft.trim(); if (user && n && n !== user.name) { useGame.setState({ user: { ...user, name: n } }); supabase.from('profiles').update({ display_name: n }).eq('id', user.id).then(() => {}); } }} />
            <div className="text-start text-xs text-white/70">
              <div className="flex justify-between mb-1"><span>{ar ? 'اكتمال القصة' : 'Story completion'}</span><span>{Math.min(100, achievements.length * 10)}%</span></div>
              <div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-gold" style={{ width: Math.min(100, achievements.length * 10) + '%' }} /></div>
            </div>
            <div className="bg-black/40 p-3 rounded-lg text-start text-xs text-white/70 max-h-40 overflow-auto">
              <p className="font-bold text-gold mb-1">{ar ? 'الإنجازات' : 'Achievements'} ({achievements.length})</p>
              {achievements.length === 0 && <p className="text-white/40">{ar ? 'لا إنجازات بعد.' : 'None yet.'}</p>}
              {achievements.map((a: string) => <p key={a}>★ {(t(a) as any) || a}</p>)}
            </div>

            <div className="flex gap-2 mt-2">
              <button className="btn flex-1 bg-blood/20 !border-blood text-blood" onClick={() => { signOut(); setProfileOpen(false); }}>
                {ar ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
              <button className="btn flex-1" onClick={() => setProfileOpen(false)}>
                {ar ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'splash' && (
        <div onClick={() => useGame.setState({ screen: 'menu' })} className="fixed inset-0 grid place-items-center text-center cursor-pointer bg-[radial-gradient(ellipse_at_50%_110%,#2b2417,#0c0b0e_65%)]">
          <div>
            <h1 className="font-display text-[clamp(3.5rem,15vw,9rem)] tracking-[.3em] text-bone">SPHINX</h1>
            <p className="mt-8 text-white/50 animate-pulse">{t('tap')}</p>
          </div>
        </div>
      )}
      {screen === 'menu' && (
        <div className="fixed inset-0 grid place-items-center p-4 bg-[radial-gradient(ellipse_at_20%_0,#14262a,#0c0b0e_60%)]">
          <div className="glass p-6 w-full max-w-sm flex flex-col gap-3">
            <h2 className="font-display text-4xl text-center tracking-widest">SPHINX</h2>
            <button className="btn !border-gold font-bold" onClick={() => { click(); useGame.setState({ inventory: [], flags: {}, achievements }); enter('bathroom_interior', 'cutscene', 'intro'); }}>
              {t('start')}
            </button>
            <button className="btn" onClick={async () => { click(); if (await load()) enter(useGame.getState().scene); }}>
              {t('cont')}
            </button>
            <button className="btn" onClick={() => useGame.setState({ settingsOpen: true })}>
              {ar ? 'الإعدادات' : 'Settings'}
            </button>
          </div>
        </div>
      )}
      {screen === 'loading' && (
        <div className="fixed inset-0 z-40 grid place-items-center text-center p-6" style={{ background: `radial-gradient(ellipse at 50% 80%,${lore.g},#0c0b0e 70%)` }}>
          <div className="max-w-md">
            <svg viewBox="0 0 200 120" className="w-56 mx-auto mb-6 opacity-70">
              <path d="M10 100h180M30 100V70q10-30 40-30t35 25l45 10v25M70 40q0-20 20-20t20 20" fill="none" stroke="#c9a45c" strokeWidth="1.5" />
              <circle cx="90" cy="44" r="3" fill="#c9a45c" />
            </svg>
            <p className="font-display text-3xl text-gold">{ar ? lore.ar : lore.en}</p>
            <div className="h-px bg-white/10 mt-8"><i className="block h-full bg-gold animate-[w_2s_ease-in-out]" style={{ width: '100%' }} /></div>
            <p className="mt-5 italic text-white/50">{t('hint')[hint]}</p>
          </div>
          <style>{`@keyframes w{from{width:0}}`}</style>
        </div>
      )}
      {screen === 'game' && <Hud />}
      {screen === 'cutscene' && <Subs />}
      {screen === 'cutscene' && <CutsceneFx />}
      {screen === 'end' && <EndScreen />}
      {settingsOptionsCheck(settingsOpen) && <Settings />}
      {err && (
        <div className="fixed inset-0 z-[90] bg-black/90 grid place-items-center p-6 text-center">
          <div className="glass p-5 max-w-md">
            <p className="text-blood font-bold mb-2">{ar ? 'حدث خطأ' : 'Something went wrong'}</p>
            <p className="text-xs text-white/60 break-words mb-4">{err}</p>
            <button className="btn" onClick={() => useGame.setState({ err: '', screen: 'menu' })}>{ar ? 'العودة' : 'Back to menu'}</button>
          </div>
        </div>
      )}
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] glass !border-gold px-5 py-2">★ {t(toast)}</div>}
    </main>
  );
}

function settingsOptionsCheck(isOpen: boolean) {
  return isOpen;
}

function Subs() {
  const ar = useGame(s => s.lang === 'ar');
  const sub = useGame(s => s.sub);
  const kind = useGame(s => s.cutscene);
  const skip = () => { if (kind === 'ending') finishEnding(); else useGame.setState({ screen: 'game', sub: '', fade: 0 }); };
  return (
    <div className="fixed inset-0 z-[76] pointer-events-none flex flex-col justify-between p-6">
      <div className="flex justify-end pointer-events-auto">
        <button onClick={skip} className="bg-black/70 hover:bg-black text-gold border border-gold/50 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-transform active:scale-95 shadow-lg">
          {ar ? 'تخطي ⏩' : 'Skip ⏩'}
        </button>
      </div>
      <div className="text-center mb-8 px-4" style={{ marginBottom: '14vh' }}>
        {sub && (
          <span key={sub} className="inline-block bg-black/70 text-[#efe6d4] border border-white/10 px-6 py-3 rounded-2xl text-base sm:text-lg max-w-xl font-medium shadow-2xl backdrop-blur-md" style={{ animation: 'subIn .5s ease both' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// fade to black, white flash and cinematic bars used by the cutscenes
function CutsceneFx() {
  const fade = useGame(s => s.fade), flash = useGame(s => s.flash), bars = useGame(s => s.bars);
  return (
    <>
      <style>{`@keyframes subIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @keyframes flick{0%{opacity:.85}8%{opacity:0}14%{opacity:.65}22%{opacity:0}30%{opacity:.4}100%{opacity:0}}`}</style>
      {bars && <><div className="fixed top-0 inset-x-0 h-[11vh] bg-black z-[74] pointer-events-none" /><div className="fixed bottom-0 inset-x-0 h-[11vh] bg-black z-[74] pointer-events-none" /></>}
      {flash > 0 && <div key={flash} className="fixed inset-0 z-[75] pointer-events-none bg-white" style={{ animation: 'flick 1.6s ease-out forwards' }} />}
      <div className="fixed inset-0 z-[75] pointer-events-none bg-black" style={{ opacity: fade }} />
    </>
  );
}
