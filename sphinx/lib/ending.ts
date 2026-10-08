import { useGame } from './store';
import { autosave } from './saves';
import { startEndingMusic } from './audio';
// Official game ending: no return to gameplay. Black screen + end card, progress saved as "ended".
export function finishEnding() {
  const s = useGame.getState();
  if (s.screen === 'end') return;
  s.unlock('ach_end');
  useGame.setState({ screen: 'end', fade: 0, sub: '', bars: false, flags: { ...s.flags, ended: true } });
  startEndingMusic();   // no-op if it is already playing
  autosave();
}
