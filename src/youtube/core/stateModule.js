// src/youtube/core/stateModule.js
// Manages the simplified state for YouTube accessibility features.

window.hudState = {
    commentShield: 'hide', // Always default to hide as requested
    shortsGuard: false
};

window.loadState = async function() {
    const result = await chrome.storage.sync.get(['synapse-youtube-hud']);
    if (result['synapse-youtube-hud']) {
        window.hudState = { ...window.hudState, ...result['synapse-youtube-hud'] };
    }
};

window.saveState = function() {
    chrome.storage.sync.set({ 'synapse-youtube-hud': window.hudState });
};
