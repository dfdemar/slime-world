/* ===== Events & Event Listeners ===== */

// Error handling
window.addEventListener('error', (e) => {
    console.error(e.error || e.message);
    notify('JS error: ' + (e.error?.message || e.message), 'error', 6000);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error(e.reason);
    notify('Promise error: ' + (e.reason?.message || e.reason), 'error', 6000);
});

// Canvas events
function initializeCanvasEvents() {
    const canvasEl = document.getElementById('canvas');
    canvasEl.addEventListener('mousemove', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / viewScale), y = Math.floor((e.clientY - rect.top) / viewScale);
        if (inBounds(x, y)) {
            World.hover = {x, y};
        } else {
            World.hover = {x: -1, y: -1};
        }
        needRedraw = true;
    });
    canvasEl.addEventListener('mouseleave', () => {
        World.hover = {x: -1, y: -1};
        needRedraw = true;
    });

    let spawnSelectedEl = null, spawnPending = null;
    Array.from(document.querySelectorAll('[data-spawn]')).forEach(btn => {
        btn.addEventListener('click', () => {
            if (spawnSelectedEl === btn) {
                btn.classList.remove('spawn-active');
                spawnSelectedEl = null;
                spawnPending = null;
                return;
            }
            if (spawnSelectedEl) {
                spawnSelectedEl.classList.remove('spawn-active');
            }
            spawnSelectedEl = btn;
            btn.classList.add('spawn-active');
            spawnPending = btn.getAttribute('data-spawn');
        });

        // Archetype tooltip functionality
        btn.addEventListener('mouseenter', () => {
            showArchetypeTooltip(btn.getAttribute('data-archetype'));
        });

        btn.addEventListener('mouseleave', () => {
            hideArchetypeTooltip();
        });
    });

    canvasEl.addEventListener('click', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / viewScale), y = Math.floor((e.clientY - rect.top) / viewScale);
        if (!inBounds(x, y)) return;
        if (spawnPending) {
            const created = newColony(spawnPending, x, y, null);
            if (created) {
                refreshLiveStats();
                updateInspector(created);
            }
            return;
        }
        const c = colonyAtCanvas((e.clientX - rect.left), (e.clientY - rect.top));
        if (c) {
            updateInspector(c);
        } else {
            updateInspector(null);
        }
    });

    window.addEventListener('resize', () => {
        resize();
        draw(true)
    });
}

// Control events
function initializeControlEvents() {
    ['ovHumidity', 'ovLight', 'ovNutrient', 'ovWater', 'ovTrail'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            clearOverlayCache(); // Clear overlay cache when overlay settings change
            needRedraw = true;
        });
    });

    document.getElementById('speed').addEventListener('input', (e) => {
        World.speed = parseFloat(e.target.value)
    });
    document.getElementById('mutRate').addEventListener('input', (e) => {
        World.mutationRate = parseFloat(e.target.value)
    });
    document.getElementById('capacity').addEventListener('input', (e) => {
        World.capacity = parseFloat(e.target.value)
    });

    document.getElementById('btnPause').addEventListener('click', playPause);
    document.getElementById('btnStep').addEventListener('click', () => {
        stepping = true;
        World.paused = true;
        document.getElementById('btnPause').textContent = '▶️ Play'
    });
    document.getElementById('btnReset').addEventListener('click', reset);
    document.getElementById('btnScreenshot').addEventListener('click', savePNG);
    document.getElementById('btnExport').addEventListener('click', saveJSON);
    document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
    document.getElementById('fileImport').addEventListener('change', loadJSON);

    document.getElementById('btnReseed').addEventListener('click', () => {
        buildEnvironment();
        Slime.clear();
        clearOverlayCache(); // Clear overlay cache since environment changed
        notify('Environment reseeded', 'warn', 900);
        needRedraw = true;
    });
    document.getElementById('btnShake').addEventListener('click', () => {
        for (let i = 0; i < World.env.humidity.length; i++) {
            World.env.humidity[i] = clamp(World.env.humidity[i] + randRange(World.rng, -0.2, 0.25), 0, 1);
            World.env.light[i] = clamp(World.env.light[i] + randRange(World.rng, -0.15, 0.2), 0, 1);
            World.env.nutrient[i] = clamp(World.env.nutrient[i] + randRange(World.rng, -0.1, 0.3), 0, 1);
        }
        clearOverlayCache(); // Clear overlay cache since environment changed
        notify('Seasonal pulse applied', 'warn', 900);
        needRedraw = true;
    });
    document.getElementById('btnOverlayCollapse').addEventListener('click', () => {
        const el = document.getElementById('overlay');
        el.classList.toggle('collapsed');
    });
    
    document.getElementById('btnCloseInspector').addEventListener('click', () => {
        updateInspector(null);
    });

    document.getElementById('btnTests').addEventListener('click', runTests);
}

// Keyboard events
function initializeKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const spawnButtons = document.querySelectorAll('[data-spawn].spawn-active');
            spawnButtons.forEach(btn => btn.classList.remove('spawn-active'));
        }
        if (e.code === 'Space') {
            e.preventDefault();
            stepping = true;
            World.paused = true;
            document.getElementById('btnPause').textContent = '▶️ Play'
        }
        if (e.key === 'p' || e.key === 'P') {
            playPause()
        }
        if (e.key === 'r' || e.key === 'R') {
            reset()
        }
        if (e.key === 's' || e.key === 'S') {
            savePNG()
        }
    });
}

// Initialize all events
function initializeEvents() {
    initializeCanvasEvents();
    initializeControlEvents();
    initializeKeyboardEvents();
}
