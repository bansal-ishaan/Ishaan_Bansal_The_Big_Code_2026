// zenReader.js: Manages the full-screen readable overlay.
// This file handles fonts, UI layout, settings, and the guide modal.

export function injectZenReader(scorer) {
    // ── STATE CACHE: re-show instead of rebuilding ────────────────────────────
    const existing = document.getElementById('neuro-zen-overlay');
    if (existing) {
        existing.style.display     = 'flex';
        document.body.style.overflow = 'hidden';
        return;
    }

    // ── FONT INJECTION ────────────────────────────────────────────────────────
    if (!document.getElementById('neuro-font')) {
        const link = document.createElement('link');
        link.id    = 'neuro-font';
        link.rel   = 'stylesheet';
        link.href  = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap';
        document.head.appendChild(link);
    }

    // ── SCORE COLOR ───────────────────────────────────────────────────────────
    const scoreColor  = scorer.overallLoad > 65 ? '#fb7185' : scorer.overallLoad > 40 ? '#fbbf24' : '#34d399';
    const scoreShadow = `0 0 15px ${scoreColor}44`;

    // ── OVERLAY SHELL ─────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id    = 'neuro-zen-overlay';
    overlay.innerHTML = `
        <div id="neuro-root-wrapper"
            style="position:fixed; top:0; left:0; width:100vw; height:100vh;
                   background: radial-gradient(ellipse at 50% -20%, #2e245e 0%, #0f172a 50%, #080b14 100%);
                   color:#cbd5e1; z-index:2147483647; display:flex; flex-direction:column;
                   font-family:'Outfit',sans-serif; overflow:hidden;
                   --neuro-font-size:21px; --neuro-line-height:1.8;">

            <!-- ── HEADER ── -->
            <div style="position:absolute; top:0; left:0; width:100vw; padding:25px 50px;
                         background:rgba(15,23,42,0.45); backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
                         border-bottom:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between;
                         align-items:center; z-index:20; box-sizing:border-box; box-shadow:0 15px 40px rgba(0,0,0,0.3);">

                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,#a78bfa,#818cf8);
                                display:flex; justify-content:center; align-items:center; font-size:18px;
                                box-shadow:0 4px 15px rgba(167,139,250,0.4);">✨</div>
                    <h1 style="margin:0; font-size:26px; font-weight:700; color:#f8fafc; letter-spacing:-0.5px;">Synapse</h1>
                </div>

                <div style="display:flex; gap:24px; align-items:center;">
                    <div style="background:${scoreColor}15; border:1px solid ${scoreColor}44; box-shadow:${scoreShadow};
                                padding:8px 20px; border-radius:30px; font-weight:600; color:${scoreColor};
                                font-size:14px; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${scoreColor};"></span>
                        Cognitive Load: ${scorer.overallLoad}
                    </div>
                    <button id="neuro-guide-toggle"    style="${BTN_STYLE}">ℹ️ Guide</button>
                    <button id="neuro-settings-toggle" style="${BTN_STYLE}">⚙️ Settings</button>
                    <button id="neuro-close-btn"       style="${BTN_STYLE} background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15);">Close Reader ✕</button>
                </div>
            </div>

            <!-- ── EMBEDDED STYLES ── -->
            <style>
                #neuro-root-wrapper *::-webkit-scrollbar       { width: 14px; }
                #neuro-root-wrapper *::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
                #neuro-root-wrapper *::-webkit-scrollbar-thumb { background: rgba(129,140,248,0.3); border-radius: 10px; border: 4px solid transparent; background-clip: padding-box; }
                #neuro-root-wrapper *::-webkit-scrollbar-thumb:hover { background-color: rgba(167,139,250,0.5); }

                #neuro-root-wrapper input:checked     + .neuro-switch           { background-color: #c084fc !important; }
                #neuro-root-wrapper input:not(:checked) + .neuro-switch         { background-color: #475569 !important; }
                #neuro-root-wrapper input:checked     + .neuro-switch .neuro-knob { transform: translateX(20px) !important; }
                #neuro-root-wrapper input:not(:checked) + .neuro-switch .neuro-knob { transform: translateX(0)  !important; }

                #neuro-root-wrapper.hide-tts .neuro-tts-btn { display: none !important; }

                #neuro-root-wrapper.use-dyslexic,
                #neuro-root-wrapper.use-dyslexic * { font-family: 'Comic Sans MS','OpenDyslexic',sans-serif !important; letter-spacing: 1px !important; }

                #neuro-root-wrapper.use-bionic .neuro-bionic { font-weight: 800 !important; color: #ffffff; }
            </style>

            <!-- ── SETTINGS PANEL ── -->
            <div id="neuro-settings-panel"
                style="position:absolute; top:95px; right:50px; background:rgba(15,23,42,0.85); backdrop-filter:blur(35px);
                       border:1px solid rgba(167,139,250,0.15); border-radius:28px; padding:35px; width:360px; z-index:15;
                       box-shadow:0 30px 70px rgba(0,0,0,0.6); opacity:0; pointer-events:none;
                       transform:translateY(-15px); transition:0.4s cubic-bezier(0.16,1,0.3,1);">

                <h3 style="margin-top:0; margin-bottom:25px; font-size:13px; text-transform:uppercase; letter-spacing:2px; color:#a5b4fc; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:12px;">Typography</h3>

                <div style="margin-bottom:25px;">
                    <label style="display:flex; justify-content:space-between; font-size:15px; margin-bottom:10px; color:#f1f5f9; font-weight:600;">
                        <span>Text Size</span> <span id="neuro-size-val" style="color:#818cf8;">21px</span>
                    </label>
                    <input type="range" id="neuro-slider-size" min="16" max="36" value="21" style="width:100%; accent-color:#c084fc; cursor:pointer; height:6px;">
                </div>

                <div style="margin-bottom:30px;">
                    <label style="display:flex; justify-content:space-between; font-size:15px; margin-bottom:10px; color:#f1f5f9; font-weight:600;">
                        <span>Line Spacing</span> <span id="neuro-space-val" style="color:#818cf8;">1.8</span>
                    </label>
                    <input type="range" id="neuro-slider-space" min="1.2" max="3.0" step="0.1" value="1.8" style="width:100%; accent-color:#c084fc; cursor:pointer; height:6px;">
                </div>

                <h3 style="margin-top:0; margin-bottom:20px; font-size:13px; text-transform:uppercase; letter-spacing:1.5px; color:#a5b4fc; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">Accessibility Features</h3>

                ${toggleRow('neuro-toggle-dyslexic', 'Dyslexic Font Match', false)}
                ${toggleRow('neuro-toggle-tts',      'Read Aloud Buttons',  true)}
                ${toggleRow('neuro-toggle-bionic',   'Bionic Reading Mode', false)}
                ${toggleRow('neuro-toggle-media',    'Dim Distracting Media', true)}
            </div>

            <!-- ── GUIDE MODAL ── -->
            <div id="neuro-guide-modal"
                style="position:absolute; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8);
                       z-index:50; display:none; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
                <div style="background:rgba(15,23,42,0.95); border:1px solid rgba(129,140,248,0.3); border-radius:20px;
                            padding:40px; width:500px; max-width:90vw; box-shadow:0 30px 60px rgba(0,0,0,0.6); position:relative;">
                    <button id="neuro-close-guide" style="position:absolute; top:20px; right:20px; background:transparent; color:white; border:none; font-size:20px; cursor:pointer;">✕</button>
                    <h2 style="margin-top:0; color:#a5b4fc; margin-bottom:25px;">Welcome to Synapse!</h2>
                    ${guideItem('✨ Cognitive Load Score',   "A real-time metric showing how complex the original page was before AI simplified it.")}
                    ${guideItem('🔊 Karaoke-Style Reading',  "Hit 'Speak' — every word highlights in sync with the voice for perfect visual tracking.")}
                    ${guideItem('🧠 Bionic & Dyslexic Fonts',"Settings → toggle Bionic Reading (bolds first half of each word) or Dyslexic Font.")}
                    ${guideItem('😏 Emotion Tags',           "Each paragraph shows its emotional tone (sarcastic, angry, excited...) so you always know the vibe.")}
                    ${guideItem('🌙 Sensorial Dimming',      "All autoplaying videos, ads, and flashing images are blurred. Hover to preview any media.")}
                </div>
            </div>

            <!-- ── CONTENT AREA ── -->
            <div style="flex:1; padding:140px 20px 100px; overflow-y:auto; scroll-behavior:smooth;">
                <div id="neuro-right-content" style="max-width:900px; margin:0 auto;">
                    <!-- AI content injected here -->
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // ── WIRE UP CONTROLS ──────────────────────────────────────────────────────
    wireSettingsPanel();
    wireGuideModal();
    wireSliders();
    wireToggles();
    wireCloseButton(overlay);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const BTN_STYLE = `background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1);
                   padding:10px 18px; cursor:pointer; border-radius:30px; font-size:14px; font-weight:600;
                   font-family:'Outfit',sans-serif; transition:0.2s;`;

function toggleRow(id, label, defaultOn) {
    const knobOffset = defaultOn ? ' transform: translateX(20px);' : '';
    const trackColor = defaultOn ? '#c084fc' : '#475569';
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="font-size:15px; color:#f1f5f9; font-weight:600;">${label}</span>
            <label style="position:relative; display:inline-block; width:44px; height:24px; margin:0;">
                <input type="checkbox" id="${id}" ${defaultOn ? 'checked' : ''} style="opacity:0; width:0; height:0; margin:0;">
                <span class="neuro-switch" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; border-radius:34px; background-color:${trackColor}; transition:.4s;">
                    <div class="neuro-knob" style="position:absolute; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%;${knobOffset}"></div>
                </span>
            </label>
        </div>`;
}

function guideItem(title, body) {
    return `
        <div style="margin-bottom:20px;">
            <strong style="color:#c084fc; font-size:16px;">${title}</strong>
            <p style="margin:5px 0 0; font-size:14px; font-weight:300; line-height:1.5; color:#cbd5e1;">${body}</p>
        </div>`;
}

function wireSettingsPanel() {
    const btn   = document.getElementById('neuro-settings-toggle');
    const panel = document.getElementById('neuro-settings-panel');
    let open    = false;

    btn.addEventListener('click', () => {
        open = !open;
        panel.style.opacity       = open ? '1'              : '0';
        panel.style.pointerEvents = open ? 'auto'           : 'none';
        panel.style.transform     = open ? 'translateY(0)'  : 'translateY(-15px)';
        btn.style.background      = open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    });
}

function wireGuideModal() {
    const btn   = document.getElementById('neuro-guide-toggle');
    const modal = document.getElementById('neuro-guide-modal');
    const close = document.getElementById('neuro-close-guide');

    btn.addEventListener('click',   () => { modal.style.display = 'flex'; });
    close.addEventListener('click', () => { modal.style.display = 'none'; });
}

function wireSliders() {
    const wrapper = document.getElementById('neuro-root-wrapper');

    document.getElementById('neuro-slider-size').addEventListener('input', (e) => {
        document.getElementById('neuro-size-val').innerText = e.target.value + 'px';
        wrapper.style.setProperty('--neuro-font-size', e.target.value + 'px');
    });

    document.getElementById('neuro-slider-space').addEventListener('input', (e) => {
        document.getElementById('neuro-space-val').innerText = e.target.value;
        wrapper.style.setProperty('--neuro-line-height', e.target.value);
    });
}

function wireToggles() {
    const wrapper = document.getElementById('neuro-root-wrapper');

    document.getElementById('neuro-toggle-tts').addEventListener('change', (e) => {
        wrapper.classList.toggle('hide-tts', !e.target.checked);
    });

    document.getElementById('neuro-toggle-dyslexic').addEventListener('change', (e) => {
        wrapper.classList.toggle('use-dyslexic', e.target.checked);
    });

    document.getElementById('neuro-toggle-bionic').addEventListener('change', (e) => {
        wrapper.classList.toggle('use-bionic', e.target.checked);
    });

    document.getElementById('neuro-toggle-media').addEventListener('change', (e) => {
        const styleTag = document.getElementById('neuro-media-control');
        if (!styleTag) return;
        styleTag.innerHTML = e.target.checked
            ? `img, video, iframe { filter: blur(10px) grayscale(50%) !important; transition: filter 0.3s ease !important; }
               img:hover, video:hover, iframe:hover { filter: none !important; }`
            : `img, video, iframe { filter: none !important; }`;
    });
}

function wireCloseButton(overlay) {
    const closeBtn = document.getElementById('neuro-close-btn');

    closeBtn.addEventListener('mouseover', () => { closeBtn.style.background = 'rgba(255,255,255,0.15)'; });
    closeBtn.addEventListener('mouseout',  () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; });

    closeBtn.addEventListener('click', () => {
        overlay.style.display        = 'none';
        document.body.style.overflow = '';

        // Floating restore badge
        let badge = document.getElementById('neuro-restore-btn');
        if (!badge) {
            badge           = document.createElement('button');
            badge.id        = 'neuro-restore-btn';
            badge.innerHTML = '👁️ Restore Zen';
            badge.style.cssText = `
                position:fixed; bottom:40px; right:40px;
                background:linear-gradient(135deg,#818cf8,#a78bfa); color:#fff;
                border:none; padding:18px 32px; border-radius:40px;
                font-weight:700; font-family:sans-serif; font-size:16px;
                cursor:pointer; z-index:2147483647;
                box-shadow:0 15px 35px rgba(167,139,250,0.4);
                text-transform:uppercase; letter-spacing:1.5px;
                transition:0.4s cubic-bezier(0.16,1,0.3,1);`;
            badge.addEventListener('mouseover', () => { badge.style.transform = 'scale(1.05) translateY(-5px)'; });
            badge.addEventListener('mouseout',  () => { badge.style.transform = 'scale(1) translateY(0)'; });
            badge.addEventListener('click', () => {
                overlay.style.display        = 'flex';
                document.body.style.overflow = 'hidden';
                badge.style.display          = 'none';
            });
            document.body.appendChild(badge);
        } else {
            badge.style.display = 'block';
        }
    });
}
