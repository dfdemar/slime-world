/* ===== PRNG & Helpers ===== */
function xmur3(str){for(var i=0,h=1779033703^str.length;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0}}
function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;var t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|c>>>11);c=c+t|0;return (t>>>0)/4294967296}}
function clamp(v,a,b){return v<a?a:(v>b?b:v)}
function lerp(a,b,t){return a+(b-a)*t}
function smoothstep(t){return t*t*(3-2*t)}
function randRange(r,min,max){return min + r()*(max-min)}
function percentile(arr, p){ const a = Array.from(arr); a.sort((x,y)=>x-y); const i = Math.max(0, Math.min(a.length-1, Math.floor(p*(a.length-1)))); return a[i]; }
function notify(msg, level='info', ttl=1600){ const el=document.getElementById('alert'); el.className=''; if(level==='warn') el.classList.add('warn'); if(level==='error') el.classList.add('error'); el.textContent=msg; el.style.display='block'; clearTimeout(notify._t); notify._t=setTimeout(()=>{el.style.display='none'}, ttl); }

/* ===== ValueNoise (fractal) ===== */
function ValueNoise(seed){
    const hash = xmur3(seed.toString());
    const r = sfc32(hash(),hash(),hash(),hash());
    const perm = new Uint8Array(512);
    for(let i=0;i<256;i++) perm[i]=i;
    for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1)); [perm[i],perm[j]]=[perm[j],perm[i]]}
    for(let i=0;i<256;i++) perm[i+256]=perm[i];
    function grad(ix,iy){const v=perm[(ix+perm[iy&255])&255]; return v/255}
    function noise2D(x,y){
        const x0=Math.floor(x), y0=Math.floor(y);
        const xf=x-x0, yf=y-y0;
        const v00=grad(x0,y0), v10=grad(x0+1,y0), v01=grad(x0,y0+1), v11=grad(x0+1,y0+1);
        const u=smoothstep(xf), v=smoothstep(yf);
        const x1=lerp(v00,v10,u); const x2=lerp(v01,v11,u);
        return lerp(x1,x2,v);
    }
    function fractal2D(x,y,oct=4, lac=2.0, gain=0.5){
        let amp=1, freq=1, sum=0, norm=0;
        for(let i=0;i<oct;i++){ sum += amp*noise2D(x*freq,y*freq); norm += amp; amp*=gain; freq*=lac }
        return sum/norm; // 0..1
    }
    return {noise2D, fractal2D, r};
}