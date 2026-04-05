// youtube.js – Synapse Main Controller for YouTube
// Focus: Comments Hidden + Shorts Timer. Other features removed as requested.

console.log('Synapse: YouTube module loaded (Simplified).');

let _hudActive = false;

window.commentShield = null;
window.shortsGuard   = null;

window.initModules = function() {
    if (window.commentShield) return; // Already initialized
    window.commentShield = window.initCommentShield();
    window.shortsGuard   = window.initShortsGuard();
};

window.updateHUD = function() {
    if (!window.hudState) return;
    const { shortsGuard, commentShield } = window;

    if (window.hudState.shortsGuard) shortsGuard?.enable(); else shortsGuard?.disable();
    commentShield?.setMode(window.hudState.commentShield);
};

async function activateSynapseYouTube() {
    if (_hudActive) {
        let hud = document.getElementById('synapse-youtube-hud');
        if (hud) hud.style.display = 'block';
        return;
    }
    
    _hudActive = true;
    window.initModules();
    await window.loadState();
    window.createHUD();
    window.updateHUD();

    if (window.commentShield) window.commentShield.init(); 
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "activate_youtube_mode") {
        activateSynapseYouTube();
        sendResponse({ success: true });
    }
});
