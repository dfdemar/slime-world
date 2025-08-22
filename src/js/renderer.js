/* ===== Rendering (with per-colony pattern) ===== */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {alpha:false});
let viewScale = 1;
function resize(){
    const rect = document.getElementById('main').getBoundingClientRect();
    const cellCSS = Math.max(2, Math.floor(Math.min((rect.width-24)/World.W, (rect.height-24)/World.H)));
    const cssW = World.W*cellCSS, cssH = World.H*cellCSS;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssW+'px';
    canvas.style.height = cssH+'px';
    canvas.width = Math.floor(cssW*dpr);
    canvas.height = Math.floor(cssH*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    canvas.style.margin='12px';
    viewScale = cellCSS;
}

function createPatternForColony(col){
    // tiny 8x8 texture, deterministic using id
    const off = document.createElement('canvas'); off.width=8; off.height=8; const p=off.getContext('2d');
    const rseed = xmur3(String(col.id)); const r = sfc32(rseed(), rseed(), rseed(), rseed());
    p.clearRect(0,0,8,8);
    p.globalAlpha = 0.9;
    const mode = Math.floor(r()*6);
    p.strokeStyle = "#ffffff"; p.lineWidth=1;
    p.fillStyle = "#ffffff";
    if(mode===0){ // diagonal /
        for(let i=-8;i<16;i+=3){ p.beginPath(); p.moveTo(i,8); p.lineTo(i+8,0); p.stroke(); }
    } else if(mode===1){ // diagonal \
        for(let i=-8;i<16;i+=3){ p.beginPath(); p.moveTo(i,0); p.lineTo(i+8,8); p.stroke(); }
    } else if(mode===2){ // grid
        for(let i=1;i<8;i+=3){ p.beginPath(); p.moveTo(i,0); p.lineTo(i,8); p.stroke(); p.beginPath(); p.moveTo(0,i); p.lineTo(8,i); p.stroke(); }
    } else if(mode===3){ // dots
        for(let y=1;y<8;y+=3){ for(let x=1;x<8;x+=3){ p.fillRect(x, y, 1, 1); } }
    } else if(mode===4){ // cross
        for(let i=1;i<8;i+=3){ p.beginPath(); p.moveTo(i,0); p.lineTo(8-i,8); p.stroke(); p.beginPath(); p.moveTo(0,i); p.lineTo(8,8-i); p.stroke(); }
    } else { // hatch + dots
        for(let i=-8;i<16;i+=4){ p.beginPath(); p.moveTo(i,8); p.lineTo(i+8,0); p.stroke(); }
        for(let y=2;y<8;y+=4){ for(let x=2;x<8;x+=4){ p.fillRect(x, y, 1, 1); } }
    }
    return off;
}

function draw(){
    const {W,H} = World; const cell=viewScale; const t=World.tiles; const b=World.biomass; ctx.imageSmoothingEnabled=false; ctx.fillStyle='#050812'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const ovH = document.getElementById('ovHumidity').checked; const ovL = document.getElementById('ovLight').checked; const ovN = document.getElementById('ovNutrient').checked; const ovW = document.getElementById('ovWater').checked; const ovT = document.getElementById('ovTrail').checked;
    if(ovH||ovL||ovN||ovW){
        const img = ctx.createImageData(W,H);
        for(let y=0;y<H;y++){
            for(let x=0;x<W;x++){
                const i=idx(x,y); const k=i*4; let r=0,g=0,bl=0; if(ovH){ g = Math.round(255*World.env.humidity[i]); } if(ovL){ r = Math.max(r, Math.round(255*World.env.light[i])); } if(ovN){ bl = Math.max(bl, Math.round(255*World.env.nutrient[i])); } if(ovW && World.env.water[i]){ r=40; g=140; bl=255; } img.data[k]=r; img.data[k+1]=g; img.data[k+2]=bl; img.data[k+3]=180;
            }
        }
        const off = document.createElement('canvas'); off.width=W; off.height=H; const octx=off.getContext('2d'); octx.putImageData(img,0,0); ctx.drawImage(off,0,0,W*cell,H*cell);
    }
    if(ovT){
        // render slime trail as heatmap overlay
        const img = ctx.createImageData(W,H);
        let max=0; for(let i=0;i<Slime.trail.length;i++) max=Math.max(max,Slime.trail[i]);
        const inv = max>0? 1/max : 0;
        for(let y=0;y<H;y++){
            for(let x=0;x<W;x++){
                const i=y*W+x, k=i*4; const p=Math.pow(Slime.trail[i]*inv,0.6);
                const r=Math.floor(255*Math.max(0, Math.min(1, p*1.2)));
                const g=Math.floor(255*Math.max(0, Math.min(1, (1.5*p*(1-p)))));
                const b=Math.floor(255*Math.max(0, Math.min(1, (1.3*(1-p)))));
                img.data[k]=r; img.data[k+1]=g; img.data[k+2]=b; img.data[k+3]=Math.floor(255*Math.min(1, 0.15+0.85*p));
            }
        }
        const off = document.createElement('canvas'); off.width=W; off.height=H; const octx=off.getContext('2d');
        octx.putImageData(img,0,0); ctx.imageSmoothingEnabled=false; ctx.drawImage(off,0,0,W*cell,H*cell);
    }
    // Draw colonies with color + pattern
    const map = new Map(); for(const c of World.colonies){ map.set(c.id, c); }
    for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
            const i=idx(x,y); const id=t[i]; if(id===-1) continue;
            const col = map.get(id);
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = col.color; ctx.fillRect(x*cell,y*cell,cell,cell);
            if(col.pattern){
                const px = x*cell, py = y*cell;
                // draw the 8x8 pattern scaled to tile
                ctx.globalAlpha = 0.22;
                ctx.imageSmoothingEnabled=false;
                ctx.drawImage(col.pattern, 0,0,8,8, px,py, cell,cell);
            }
        }
    }
    ctx.globalAlpha=1;
    // hover
    if(World.hover.x>=0){ ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2; ctx.strokeRect(World.hover.x*cell+0.5, World.hover.y*cell+0.5, cell-1, cell-1); }
}