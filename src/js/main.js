/* ===== Main Application ===== */

// Boot sequence
(function(){ 
    const sEl = document.getElementById('status'); 
    if(sEl) sEl.textContent = 'booting…'; 
})();

/* ===== Init ===== */
function run(){
    const seed = parseInt(document.getElementById('seed').value||'1337',10);
    const size = document.getElementById('worldSize').value;
    setupWorld(seed, size);
    resize();
    requestAnimationFrame(loop);
}

// Initialize the application
function initialize() {
    // Set up event listeners
    initializeEvents();
    
    // Start the simulation
    run();
    
    // Update status
    const sEl = document.getElementById('status');
    if(sEl) sEl.textContent = 'ready';
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}