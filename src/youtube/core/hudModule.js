
// src/youtube/core/hudModule.js
// Simplified Synapse YouTube control panel with only Comments and Shorts toggles.

window.createHUD = function() {
    if (document.getElementById('synapse-youtube-hud')) return;
    
    console.log('Synapse: Creating Simplified YouTube HUD');
    const hud = document.createElement('div');
    hud.id = 'synapse-youtube-hud';
    hud.innerHTML = `
        <div style="background: rgba(15,23,42,0.95); border: 1px solid rgba(129,140,248,0.3); border-radius: 16px; padding: 20px; font-family: 'Outfit', sans-serif; color: #e2e8f0; min-width: 250px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,#a78bfa,#818cf8); display: flex; justify-content: center; align-items: center; font-size: 16px;">✨</div>
                    <h3 style="margin: 0; color: #a5b4fc; font-size: 18px;">Synapse YT</h3>
                </div>
                <button id="synapse-close-hud" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 20px;">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 18px;">
                <!-- Comment Shield -->
                <div class="synapse-control">
                    <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <span>💬 Hide Comments</span>
                        <input type="checkbox" id="comment-toggle" style="width: 16px; height: 16px;">
                    </label>
                </div>

                <!-- Shorts Guard -->
                <div class="synapse-control">
                    <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <span>⏸ Shorts Timer</span>
                        <input type="checkbox" id="shorts-toggle" style="width: 16px; height: 16px;">
                    </label>
                </div>
            </div>
            
            <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #94a3b8; text-align: center;">
                Neural Mode: Focus active
            </div>
        </div>
    `;

    hud.style.position = 'fixed';
    hud.style.bottom = '20px';
    hud.style.right = '20px';
    hud.style.zIndex = '10000';
    document.body.appendChild(hud);

    // Initial Wiring
    const commentToggle = document.getElementById('comment-toggle');
    const shortsToggle = document.getElementById('shorts-toggle');

    commentToggle.checked = window.hudState.commentShield === 'hide';
    shortsToggle.checked = window.hudState.shortsGuard;

    // Listeners
    commentToggle.onchange = () => {
        window.hudState.commentShield = commentToggle.checked ? 'hide' : 'show';
        window.updateHUD();
        window.saveState();
    };

    shortsToggle.onchange = () => {
        window.hudState.shortsGuard = shortsToggle.checked;
        window.updateHUD();
        window.saveState();
    };

    document.getElementById('synapse-close-hud').onclick = () => {
        hud.style.display = 'none';
    };
};
