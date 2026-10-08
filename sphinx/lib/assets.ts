// Shared model cache + preloader.
// Every GLB in the game (scenes, Nour, ...) goes through here, so a model that was preloaded behind the loading screen is the
// SAME object the 3D components read later: nothing streams in after a cutscene has started (no visual popping).
//   preloadAll()  -> resolves only when every listed file is downloaded AND parsed (100 %), reports real byte progress
//   readModel()   -> Suspense-style read for components (throws the pending promise until the model is ready)
import { GzGLTFLoader } from './gzLoader';

type Entry = { p: Promise<any>; v?: any; e?: any; loaded: number; total: number; done: boolean };
const cache = new Map<string, Entry>();

export function preloadModel(url: string): Promise<any> {
  let en = cache.get(url);
  if (en) return en.p;
  en = { loaded: 0, total: 0, done: false } as Entry;
  const entry = en;
  entry.p = new Promise((res, rej) => {
    new GzGLTFLoader().load(
      url,
      (g: any) => { entry.v = g; entry.done = true; if (entry.total) entry.loaded = entry.total; res(g); },
      (ev: any) => { if (ev?.total) { entry.loaded = ev.loaded; entry.total = ev.total; } },
      (err: any) => { entry.e = err; entry.done = true; rej(err); },
    );
  });
  entry.p.catch(() => {});            // failures are reported through readModel / preloadAll, never as unhandled rejections
  cache.set(url, entry);
  return entry.p;
}

export function readModel(url: string): any {
  const en = cache.get(url) || (preloadModel(url), cache.get(url)!);
  if (en.e) throw en.e;
  if (!en.done) throw en.p;
  return en.v;
}
export const isModelReady = (url: string) => !!cache.get(url)?.v;
// only drops the entry if it still holds the model being released (a newer load of the same file must survive an old cleanup)
export const releaseModel = (url: string, gltf?: any) => { const e = cache.get(url); if (e && (!gltf || e.v === gltf)) cache.delete(url); };

export type Need = { url: string; optional?: boolean };
// Waits for ALL files. Progress is 0..100 (average of the files' byte progress); it only reports 100 once every file is fully parsed.
export async function preloadAll(list: Need[], onProgress?: (pct: number) => void) {
  const urls = [...new Set(list.map(n => n.url))];
  urls.forEach(u => preloadModel(u));
  const tick = () => {
    let l = 0, t = 0;
    urls.forEach(u => { const e = cache.get(u)!; if (e.done && !e.e) { l += 1; t += 1; } else { l += e.total ? e.loaded / e.total : 0; t += 1; } });
    onProgress?.(Math.min(99, Math.floor((l / Math.max(1, t)) * 100)));
  };
  const id = setInterval(tick, 80);
  try {
    await Promise.all(list.map(n => preloadModel(n.url).catch(err => { if (!n.optional) throw err; console.warn('[assets] optional model failed', n.url, err); })));
  } finally { clearInterval(id); }
  onProgress?.(100);
}
