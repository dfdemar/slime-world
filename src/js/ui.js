/* ===== Interaction & UI ===== */
let needRedraw=true; let stepping=false; let last=0;
function loop(ts){
    last = ts;
    if(!World.paused || stepping){ stepEcosystem(); needRedraw=true; stepping=false; }
    if(needRedraw){ draw(); needRedraw=false; }
    refreshInspectorRealtime(); // Update inspector stats in real-time
    requestAnimationFrame(loop);
}
function playPause(){ World.paused = !World.paused; document.getElementById('btnPause').textContent = World.paused? '▶️ Play' : '⏸️ Pause'; }
function reset(){ const seed = parseInt(document.getElementById('seed').value||'1337',10); const size = document.getElementById('worldSize').value; setupWorld(seed, size); World.paused=false; document.getElementById('btnPause').textContent='⏸️ Pause'; resize(); draw(); }

function colonyAtCanvas(px,py){ const cell=viewScale; const x=Math.floor(px/cell), y=Math.floor(py/cell); if(!inBounds(x,y)) return null; const id=World.tiles[idx(x,y)]; if(id===-1) return null; return World.colonies.find(c=>c.id===id) || null; }

let selectedId=null;
function updateInspector(c){
    const el=document.getElementById('inspector'); const stats=document.getElementById('stats'); const rt=document.getElementById('rtStats');
    if(!c){ el.textContent='Click a colony to inspect.'; stats.innerHTML=''; selectedId=null; const mv=document.getElementById('miniView'); if(mv){ const mctx=mv.getContext('2d'); mctx.clearRect(0,0,mv.width,mv.height);} if(rt) rt.innerHTML=''; return }
    selectedId=c.id;
    const name=(c?.name)||(Archetypes[c?.type]?.name)||(c?.type)||'Unknown';
    el.innerHTML='<div style="display:flex; align-items:center; gap:8px;">'+
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid #fff; background:'+c.color+'"></div>'+
        '<div>'+
        '<b>'+name+'</b> <span class="small">(#'+c.id+')</span><br/>'+
        '<span class="small italic">Species: '+(c.species||'—')+'</span><br/>'+
        '<span class="small">Gen '+c.gen+' • Age '+c.age+'</span>'+
        '</div>'+
        '</div>'+
        '<div style="margin-top:6px" class="small">Parent: '+(c.parent??'—')+' • Kids: '+c.kids.length+'</div>';
    function bar(label,val){ const w=Math.round(100*clamp(val,0,1)); return '<div class="stat"><div style="display:flex; justify-content:space-between"><span>'+label+'</span><span>'+w+'%</span></div><div style="height:8px;background:#0c1426;border-radius:999px;margin-top:6px;overflow:hidden"><div style="width:'+w+'%;height:100%;background:linear-gradient(90deg, var(--accent), var(--accent-2))"></div></div></div>' }
    stats.innerHTML = bar('Water Need', c.traits.water_need) + bar('Light Use', c.traits.light_use) + bar('Photosymbiosis', c.traits.photosym) + bar('Transport', c.traits.transport) + bar('Predation', c.traits.predation) + bar('Defense', c.traits.defense) + bar('Spore Rate', c.traits.spore) + bar('Flow', c.traits.flow);
    refreshInspectorRealtime(true);
}
function refreshInspectorRealtime(force=false){
    const rt=document.getElementById('rtStats'); if(!rt) return;
    if(!selectedId){ rt.innerHTML=''; return; }
    const col = World.colonies.find(c=>c.id===selectedId); if(!col){ rt.innerHTML=''; return; }
    let tiles=0, mass=0, fit=0, minFit=1, maxFit=0;
    for(let i=0;i<World.tiles.length;i++){ if(World.tiles[i]===col.id){ tiles++; mass += World.biomass[i]; const x=(i%World.W), y=Math.floor(i/World.W); const s=suitabilityAt(col,x,y); fit+=s; minFit=Math.min(minFit,s); maxFit=Math.max(maxFit,s);} }
    fit = tiles? fit/tiles : 0;
    rt.innerHTML = ''
        + '<div class="kv"><div class="k">Tiles</div><div class="v">'+tiles+'</div><div class="k">Mass</div><div class="v">'+mass.toFixed(2)+'</div></div>'
        + '<div class="kv"><div class="k">Avg Suit</div><div class="v">'+fit.toFixed(2)+'</div><div class="k">Fit Range</div><div class="v">'+minFit.toFixed(2)+'–'+maxFit.toFixed(2)+'</div></div>';
    // mini view
    const mv=document.getElementById('miniView'); const mctx=mv.getContext('2d'); mctx.clearRect(0,0,mv.width,mv.height);
    mctx.fillStyle='#0a1326'; mctx.fillRect(0,0,mv.width,mv.height);
    mctx.fillStyle='#9fb4ff';
    const sx = mv.width/World.W, sy = mv.height/World.H;
    for(let i=0;i<World.tiles.length;i++){ if(World.tiles[i]===col.id){ const x=(i%World.W), y=Math.floor(i/World.W); mctx.globalAlpha=0.8; mctx.fillRect(x*sx, y*sy, Math.max(1,sx), Math.max(1,sy)); } }
}

/* ===== Legend & Misc ===== */
function refreshLegend(){
    const legend=document.getElementById('legend');
    legend.innerHTML='';
    const sorted=[...World.colonies].slice(-10).reverse();
    for(const c of sorted){
        const chip=document.createElement('div'); chip.className='chip';
        const d=document.createElement('div'); d.className='dot'; d.style.background=c.color; chip.appendChild(d);
        const label = (c.species||c.name||Archetypes[c.type]?.name||c.type||'Unknown') + ' #' + c.id;
        chip.appendChild(document.createTextNode(label));
        legend.appendChild(chip);
    }
}
function savePNG(){
    const a = document.createElement('a'); a.download = 'slimeworld.png'; a.href = canvas.toDataURL('image/png'); a.click();
}
function saveJSON(){
    const data = { W:World.W, H:World.H, env:{humidity:Array.from(World.env.humidity), light:Array.from(World.env.light), nutrient:Array.from(World.env.nutrient), water:Array.from(World.env.water)}, tiles:Array.from(World.tiles), biomass:Array.from(World.biomass), colonies:World.colonies, nextId:World.nextId, tick:World.tick };
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='slimeworld_save.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function loadJSON(e){
    const file = e.target.files[0]; if(!file) return; const reader=new FileReader();
    reader.onload = ()=>{
        try{
            const data = JSON.parse(reader.result);
            const sizeStr = data.W+'x'+data.H; setupWorld(1337, sizeStr);
            World.env.humidity.set(data.env.humidity); World.env.light.set(data.env.light); World.env.nutrient.set(data.env.nutrient); World.env.water.set(data.env.water);
            World.tiles.set(data.tiles); World.biomass.set(data.biomass);
            World.colonies = data.colonies.map(c => ({...c, pattern:createPatternForColony(c)}));
            World.nextId = data.nextId; World.tick = data.tick;
            refreshLegend(); draw(); notify('Loaded save','warn',1000);
        }catch(err){ console.error(err); notify('Load failed','error',2000); }
    };
    reader.readAsText(file);
}
