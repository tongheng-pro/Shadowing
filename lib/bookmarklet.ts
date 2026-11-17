/* =========================================================
   "Shadow this video" bookmarklet.

   Why: YouTube blocks caption requests from cloud servers
   (Vercel runs on AWS), so /api/transcript often fails in
   production. The bookmarklet runs on youtube.com in the
   user's own browser (home IP, same origin), fetches the
   captions there, and opens the app with them in the URL hash:

     <app>/?v=VIDEO_ID#cap=<base64url(deflate-raw(JSON))>

   JSON payload: { t: title, l: lang, k: 'manual'|'auto', x: caption XML }
   The hash never reaches the server. If the bookmarklet cannot
   get captions it opens <app>/?v=VIDEO_ID (server fallback).
   ========================================================= */

/** Readable source of the bookmarklet. `__APP__` is replaced with the app URL. */
const SOURCE = `(async()=>{
const A='__APP__';
const v=new URLSearchParams(location.search).get('v')||(location.pathname.match(/(?:shorts|live)\\/([\\w-]{11})/)||[])[1];
if(!v){alert('Open a YouTube video first');return}
const go=h=>{location.href=A+'?v='+v+(h?'#cap='+h:'')};
try{
const r=await fetch('/youtubei/v1/player',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'ANDROID',clientVersion:'20.10.38',hl:'en'}},videoId:v})});
const j=await r.json();
const T=((j.captions||{}).playerCaptionsTracklistRenderer||{}).captionTracks||[];
const en=t=>/^en/i.test(t.languageCode||'');
let p=T.find(t=>t.kind!=='asr'&&en(t))||T.find(en),x=0;
if(!p&&T[0]){p=T[0];x=1}
if(!p){go();return}
const xml=await(await fetch(p.baseUrl.replace(/&fmt=[^&]*/g,'')+(x?'&tlang=en':''),{credentials:'omit'})).text();
if(!xml){go();return}
const d=JSON.stringify({t:(j.videoDetails||{}).title||document.title,l:p.languageCode||'en',k:p.kind==='asr'?'auto':'manual',x:xml});
const b=new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));
go(btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''));
}catch(e){go()}
})()`;

/** The `javascript:` URL to drag to the bookmarks bar. `appUrl` = app address without query/hash. */
export function bookmarkletHref(appUrl: string): string {
  // Lines end with ; { } or , so joining them without newlines is safe.
  const code = SOURCE.replace('__APP__', appUrl.replace(/'/g, "\\'")).replace(/\n/g, '');
  // Encode: the code contains '#', which would otherwise start a URL fragment.
  return 'javascript:' + encodeURIComponent(code);
}

export interface CaptionPayload {
  title: string;
  lang: string;
  kind: 'manual' | 'auto';
  xml: string;
}

/** Decode the `#cap=` value written by the bookmarklet. Returns null if it is not valid. */
export async function decodeCaptionPayload(cap: string): Promise<CaptionPayload | null> {
  try {
    const bin = atob(cap.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const data: unknown = JSON.parse(await new Response(stream).text());
    if (!data || typeof data !== 'object') return null;
    const o = data as Record<string, unknown>;
    if (typeof o.x !== 'string' || !o.x) return null;
    return {
      title: typeof o.t === 'string' && o.t ? o.t : 'YouTube lesson',
      lang: typeof o.l === 'string' ? o.l : 'en',
      kind: o.k === 'auto' ? 'auto' : 'manual',
      xml: o.x,
    };
  } catch {
    return null;
  }
}
