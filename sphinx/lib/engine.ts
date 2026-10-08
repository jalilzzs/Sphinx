// Interaction engine for the puzzle system: examine / keypad / switches / containers / exits, monologues and camera focus events.
import { useGame } from './store';
import { PUZ, ITEMS, type Pz } from './puzzles';
import { placeOf } from './place';
import { world } from './world';
import { paper, doorMetal, doorLocked, click, sting } from './audio';
import { autosave } from './saves';
import { D } from './i18n';

type T = { en: string; ar: string };
const tr = (o: T) => (useGame.getState().lang === 'ar' ? o.ar : o.en);

// The character thinks out loud: a short italic line at the bottom of the screen.
export function think(o: T | undefined, ms = 5200) {
  if (!o) return;
  const id = Date.now();
  useGame.setState({ mono: tr(o), monoId: id });
  setTimeout(() => { if (useGame.getState().monoId === id) useGame.setState({ mono: '' }); }, ms);
}
export const flicker = () => useGame.setState({ flash: Date.now() });

// Camera briefly turns toward another interactable (cinematic bars appear, player is held).
export function focusOn(id: string, ms = 2600) {
  const s = useGame.getState(); const p = (PUZ[s.scene] || []).find(x => x.id === id); if (!p) return;
  const v = placeOf(s.scene, p);
  world.focus = { x: v.x, y: v.y, z: v.z, until: performance.now() + ms };
  useGame.setState({ bars: true });
}

function done(p: Pz) {
  const s = useGame.getState(), t = D[s.lang] as any;
  const flags = { ...s.flags, [p.id]: true } as Record<string, boolean>;
  if (p.fx === 'power') flags['power_' + s.scene] = true;
  let inventory = s.inventory;
  if (p.give && !inventory.includes(p.give)) inventory = [...inventory, p.give];
  s.set({ flags, inventory });
  doorMetal();
  if (p.give) s.say(t.got + (s.lang === 'ar' ? ITEMS[p.give].ar : ITEMS[p.give].en));
  if (p.fx === 'power') { flicker(); sting(); } else if (p.fx === 'sting') sting();
  think(p.mono);
  if (p.focus) setTimeout(() => focusOn(p.focus!), p.mono ? 1100 : 250);
  autosave();
}

export function interact(p: Pz) {
  const s = useGame.getState();
  if (p.reqFlag && !s.flags[p.reqFlag]) { doorLocked(); think(p.locked || { en: 'Not yet.', ar: 'ليس بعد.' }); return; }
  if (p.kind === 'clue') {
    const first = !s.flags[p.id];
    s.set({ flags: { ...s.flags, [p.id]: true } });
    paper(); s.unlock('ach_clue');
    if (p.note) useGame.setState({ card: { id: p.id } });
    else if (first) think(p.mono);
    autosave(); return;
  }
  if (p.kind === 'code') { if (!s.flags[p.id]) { click(); useGame.setState({ lock: { id: p.id, len: p.code!.length } }); } return; }
  if (p.need && !s.inventory.includes(p.need)) { doorLocked(); think(p.needMsg || p.locked); return; }
  if (p.kind === 'exit') {
    s.set({ flags: { ...s.flags, [p.id]: true }, exitReq: Date.now() as any });
    doorMetal(); think(p.mono, 3000); return;
  }
  done(p); // switch / container
}

export function solveCode(p: Pz, value: string): boolean {
  if (value === p.code) { useGame.setState({ lock: null }); done(p); return true; }
  doorLocked(); think(p.wrong || { en: 'Nothing happens.', ar: 'لا شيء يحدث.' }, 3500); return false;
}

// Closing a paper note: the character reacts to it (first time only)
export function closeCard() {
  const s = useGame.getState(), id = s.card?.id; useGame.setState({ card: null });
  const p = (PUZ[s.scene] || []).find(x => x.id === id); if (!p) return;
  const key = 'seen_' + p.id;
  if (!s.flags[key]) { useGame.setState(x => ({ flags: { ...x.flags, [key]: true } })); setTimeout(() => think(p.mono), 350); }
}
