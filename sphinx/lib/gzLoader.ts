import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// GLTFLoader that detects the real file format from its first bytes (not from the extension):
//   "glTF"      -> plain GLB
//   1f 8b       -> gzip-compressed GLB (decompressed with the browser's built-in DecompressionStream)
// It also reports clear errors (404 page, Git LFS pointer, unsupported browser) instead of a cryptic "JSON Parse error".
export class GzGLTFLoader extends GLTFLoader {
  load(url: string, onLoad: any, onProgress?: any, onError?: any) {
    const fail = (e: any) => { const err = e instanceof Error ? e : new Error(String(e)); console.error('[model]', err.message); onError ? onError(err) : console.error(err); };
    (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Model not found: ${url} (HTTP ${r.status})`);
        // stream the body so callers get REAL byte progress (used by the loading screen / asset gate)
        const total = +(r.headers.get('content-length') || 0);
        let buf: ArrayBuffer;
        if (r.body && total > 0 && onProgress) {
          const rd = r.body.getReader(), parts: Uint8Array[] = []; let got = 0;
          for (;;) {
            const { done, value } = await rd.read();
            if (done) break;
            parts.push(value); got += value.length;
            onProgress({ loaded: got, total, lengthComputable: true });
          }
          const all = new Uint8Array(got); let o = 0;
          for (const c of parts) { all.set(c, o); o += c.length; }
          buf = all.buffer;
        } else buf = await r.arrayBuffer();
        let u = new Uint8Array(buf);
        if (u[0] === 0x1f && u[1] === 0x8b) {
          if (typeof DecompressionStream === 'undefined') throw new Error(`This browser cannot open compressed models (${url}). Please update your browser.`);
          buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          u = new Uint8Array(buf);
        }
        const magic = String.fromCharCode(u[0], u[1], u[2], u[3]);
        if (magic !== 'glTF') {
          const head = new TextDecoder().decode(u.slice(0, 40));
          if (head.startsWith('version https://git-lfs')) throw new Error(`${url} is a Git LFS pointer, not the real model. Enable Git LFS in Vercel (Settings > Git) or commit the file without LFS.`);
          throw new Error(`${url} is not a valid GLB file (starts with "${head.replace(/[^\x20-\x7e]/g, '?').slice(0, 24)}").`);
        }
        this.parse(buf, url.substring(0, url.lastIndexOf('/') + 1), onLoad, fail);
      } catch (e) { fail(e); }
    })();
  }
}
