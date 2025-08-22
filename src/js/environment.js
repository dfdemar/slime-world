/* ===== Environment Generation ===== */

/* --- Environment with pooled water --- */
function smoothBinaryGrid(src, W, H, iters=2){
    const a=new Uint8Array(src); const b=new Uint8Array(src.length);
    for(let t=0;t<iters;t++){
        for(let y=0;y<H;y++){
            for(let x=0;x<W;x++){
                let cnt=0; for(let dy=-1;dy<=1;dy++){ for(let dx=-1;dx<=1;dx++){ if(dx===0&&dy===0) continue; const nx=x+dx, ny=y+dy; if(nx>=0&&ny>=0&&nx<W&&ny<H) cnt+=a[ny*W+nx]; }}
                const i=y*W+x; if(cnt>=5) b[i]=1; else if(cnt<=2) b[i]=0; else b[i]=a[i];
            }
        }
        a.set(b);
    }
    return a;
}

function buildEnvironment(){
    const {W,H,env} = World; const f = World.field;
    const sHum=randRange(World.rng, 120, 420), sLig=randRange(World.rng, 200, 700), sNut=randRange(World.rng, 150, 600), sWat=randRange(World.rng, 180, 520);
    const waterSeed = new Float32Array(W*H);
    for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
            const nx=x/W, ny=y/H;
            const h0 = f.fractal2D(nx*sHum, ny*sHum, 4, 2.0, 0.55);
            const l0 = f.fractal2D(1000+nx*sLig, 1000+ny*sLig, 4, 2.0, 0.5);
            const n0 = f.fractal2D(2000+nx*sNut, 2000+ny*sNut, 5, 2.2, 0.55);
            const basin = f.fractal2D(3000+nx*sWat, 3000+ny*sWat, 5, 2.2, 0.55);
            const band = 0.5+0.5*Math.sin((ny-0.2)*Math.PI*2);
            const light = clamp(0.25 + 0.75*l0*band, 0, 1);
            const humid = clamp(0.2 + 0.8*h0*(1.0 - 0.25*Math.abs(nx-0.5)), 0, 1);
            const nutr  = clamp(0.3 + 0.7*n0, 0, 1);
            env.humidity[idx(x,y)] = humid;
            env.light[idx(x,y)] = light;
            env.nutrient[idx(x,y)] = nutr;
            const seed = 0.55*humid + 0.3*(1-light) + 0.6*(basin-0.5);
            waterSeed[idx(x,y)] = seed;
        }
    }
    let water = new Uint8Array(W*H);
    const desired = 0.22 + 0.08*World.rng();
    const thr = percentile(waterSeed, 1 - desired);
    for(let i=0;i<water.length;i++) water[i] = waterSeed[i] > thr ? 1 : 0;
    water = smoothBinaryGrid(water, W, H, 2);
    const cleaned=new Uint8Array(water.length);
    for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
            const i=idx(x,y); if(!water[i]) { cleaned[i]=0; continue; }
            let cnt=0; for(let dy=-1;dy<=1;dy++){ for(let dx=-1;dx<=1;dx++){ if(dx===0&&dy===0) continue; const nx=x+dx, ny=y+dy; if(nx>=0&&ny>=0&&nx<W&&ny<H) cnt+=water[ny*W+nx]; }}
            cleaned[i] = cnt>=1 ? 1 : 0;
        }
    }
    env.water.set(cleaned);
    for(let i=0;i<W*H;i++){
        if(env.water[i]){ env.humidity[i] = clamp(env.humidity[i]*0.88 + 0.12*1,0,1); env.nutrient[i] = clamp(env.nutrient[i] + 0.04, 0,1); }
    }
}