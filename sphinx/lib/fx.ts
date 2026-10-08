// Screen-space "eye" effects driven from the render loop without React re-renders: CSS variables read by the overlay in Game.tsx.
//   --blink : 0 = eyes open .. 1 = eyelids fully closed
//   --tear  : 0..1 watery haze around the edges of the view (crying)
const root = () => (typeof document !== 'undefined' ? document.documentElement : null);
let lastB = -1, lastT = -1;
export function setBlink(v: number) { v = Math.min(1, Math.max(0, v)); if (Math.abs(v - lastB) < .004) return; lastB = v; root()?.style.setProperty('--blink', v.toFixed(3)); }
export function setTear(v: number) { v = Math.min(1, Math.max(0, v)); if (Math.abs(v - lastT) < .004) return; lastT = v; root()?.style.setProperty('--tear', v.toFixed(3)); }
export function resetEyes() { lastB = lastT = -1; setBlink(0); setTear(0); }
