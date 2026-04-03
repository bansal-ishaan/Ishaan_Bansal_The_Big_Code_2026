// renderer.js: Takes the AI results and draws them onto the screen.
// This handles the loading screens, summary cards, and the paragraph blocks.

import { formatBionicText } from '../utils/bionicText.js';

// ── EMOTION CONFIGURATION ────────────────────────────────────────────────────
// Maps Groq-detected emotion → visual badge style + TTS adverb prefix

const EMOTION_MAP = {
    sarcastic: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',   emoji: '😏', adverb: 'Sarcastically says' },
    angry:     { color: '#fb7185', bg: 'rgba(251,113,133,0.1)', border: 'rgba(251,113,133,0.25)',  emoji: '😠', adverb: 'Angrily says'        },
    excited:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',   emoji: '🤩', adverb: 'Excitedly says'      },
    fearful:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)',  emoji: '😨', adverb: 'Fearfully says'      },
    sad:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',   emoji: '😔', adverb: 'Sadly says'          },
    urgent:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',   emoji: '⚠️', adverb: 'Urgently says'       },
    humorous:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',   emoji: '😄', adverb: 'Humorously says'     },
    critical:  { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.25)',    emoji: '🔴', adverb: 'Critically says'     },
    neutral:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)',border: 'rgba(148,163,184,0.15)',  emoji: '💬', adverb: ''                   },
};

// ── INIT RIGHT PANEL ─────────────────────────────────────────────────────────

export function initRightPanel() {
    const rightPane = document.getElementById('neuro-right-content');
    if (!rightPane) return;

    rightPane.innerHTML = `
        <div id="neuro-ai-metadata"></div>
        <div id="neuro-ai-chunks" style="margin-top: 50px;"></div>
        <div id="neuro-ai-status" style="text-align: center; margin-top: 80px; padding: 40px; background: rgba(99,102,241,0.03); border-radius: 20px; border: 1px dashed rgba(99,102,241,0.2);">
            <div style="font-size: 34px; margin-bottom: 20px; animation: pulse 2s infinite;">✨</div>
            <h3 id="neuro-status-text" style="color: #818cf8; font-size: 20px; font-weight: 300; margin:0;">Waking up LPU core...</h3>
        </div>
    `;

    // Inject keyframe animations once
    if (!document.getElementById('neuro-animations')) {
        const style = document.createElement('style');
        style.id = 'neuro-animations';
        style.innerHTML = `
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse   { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
        `;
        document.head.appendChild(style);
    }
}

// ── STATUS UPDATER ───────────────────────────────────────────────────────────

export function updateAIStatus(message) {
    const statusEl  = document.getElementById('neuro-status-text');
    const statusBox = document.getElementById('neuro-ai-status');
    if (statusEl) statusEl.innerText = message;
    if (message === 'Done!' && statusBox) statusBox.style.display = 'none';
}

// ── METADATA CARD RENDERER ──────────────────────────────────────────────────

export function renderAIMetadata(data) {
    const metaBox = document.getElementById('neuro-ai-metadata');
    if (!metaBox) return;

    if (data.error) {
        metaBox.innerHTML = `
            <div style="text-align:center; color:#ff4b4b; padding: 40px; background: rgba(255,75,75,0.1); border-radius: 16px; border: 1px solid rgba(255,75,75,0.3);">
                <h2>⚠️ Engine Connection Failed</h2>
                <p>${data.error}</p>
            </div>`;
        return;
    }

    const safeSummary = (data.page_summary || '').replace(/"/g, '&quot;');

    metaBox.innerHTML = `
        <div style="display:flex; gap:24px; align-items:center; margin-bottom:40px; animation: slideUp 0.7s cubic-bezier(0.16,1,0.3,1);">

            <!-- Article Summary (wide) -->
            <div style="flex:1; background:rgba(255,255,255,0.025); backdrop-filter:blur(15px); padding:45px 50px; border-radius:32px; border:1px solid rgba(255,255,255,0.06); position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.25);">
                <button class="neuro-tts-btn neuro-tts-tldr" data-text="${safeSummary}"
                    style="position:absolute; top:35px; right:35px; background:rgba(167,139,250,0.15); color:#a78bfa; border:none; padding:10px 22px; border-radius:30px; cursor:pointer; font-size:14px; font-weight:600; transition:0.3s; font-family:'Outfit',sans-serif;">
                    🔊 Listen
                </button>
                <h3 style="color:#94a3b8; font-size:13px; text-transform:uppercase; letter-spacing:2px; margin-top:0; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:18px; margin-bottom:24px;">
                    📝 Article Summary
                </h3>
                <p style="font-size:var(--neuro-font-size,20px); margin-bottom:0; color:#f8fafc; padding-right:120px; font-weight:300; line-height:var(--neuro-line-height,1.6);">
                    ${formatBionicText(data.page_summary)}
                </p>
            </div>

            <!-- Detected Tone (compact badge) -->
            <div style="flex:0 0 240px; background:linear-gradient(155deg,rgba(109,40,217,0.18),rgba(79,70,229,0.12)); backdrop-filter:blur(15px); padding:30px 20px; border-radius:28px; border:1px solid rgba(167,139,250,0.15); box-shadow:0 20px 50px rgba(0,0,0,0.3); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                <span style="font-weight:700; color:#c084fc; text-transform:uppercase; font-size:12px; letter-spacing:2px; opacity:0.9;">Detected Tone</span>
                <div style="font-size:26px; font-weight:600; margin-top:15px; color:#f8fafc; line-height:1.3;">${data.page_tone || 'Neutral'}</div>
            </div>
        </div>
    `;
}

// ── CHUNK CARD RENDERER ──────────────────────────────────────────────────────

export function renderAIChunk(data) {
    const chunkBox = document.getElementById('neuro-ai-chunks');
    if (!chunkBox || data.error) return;

    let html = '';

    (data.simplified_chunks || []).forEach(chunk => {
        const emotion     = (chunk.emotion || 'neutral').toLowerCase();
        const emo         = EMOTION_MAP[emotion] || EMOTION_MAP['neutral'];
        const baseHeading = chunk.heading       || 'Extracted Insight';
        const bullets     = chunk.bullet_points || [];

        // Build bullet list HTML with bionic formatting
        const bulletsHtml = bullets.map(bp => `
            <li style="margin-bottom:15px; display:flex; gap:18px;">
                <span style="color:#c084fc; font-weight:bold; flex-shrink:0; font-family:sans-serif; margin-top:-2px;">→</span>
                <span>${formatBionicText(bp)}</span>
            </li>`
        ).join('');

        // TTS text: emotion announced first for Autistic users
        const ttsPrefix = emo.adverb ? `${emo.adverb}, ` : '';
        const rawText   = ttsPrefix + [baseHeading, ...bullets].join(' ');
        const safeText  = rawText.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        html += `
            <div style="margin-bottom:35px; animation:slideUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; background:rgba(255,255,255,0.02); backdrop-filter:blur(15px); padding:45px 50px; border-radius:32px; border:1px solid ${emo.border}; position:relative; transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.4s ease, box-shadow 0.4s ease;"
                onmouseover="this.style.background='rgba(255,255,255,0.035)'; this.style.transform='translateY(-6px)'; this.style.boxShadow='0 25px 60px rgba(0,0,0,0.4)';"
                onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">

                <!-- Emotion Badge -->
                <div style="display:inline-flex; align-items:center; gap:7px; background:${emo.bg}; border:1px solid ${emo.border}; color:${emo.color}; padding:6px 16px; border-radius:20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:20px;">
                    <span>${emo.emoji}</span>
                    <span>${emotion}</span>
                </div>

                <!-- TTS Speak Button -->
                <button class="neuro-tts-btn" data-text="${safeText}"
                    style="position:absolute; top:40px; right:40px; background:rgba(255,255,255,0.06); color:#e2e8f0; border:none; padding:10px 22px; border-radius:30px; cursor:pointer; font-size:13px; font-weight:600; transition:0.3s; font-family:'Outfit',sans-serif;">
                    🔊 Speak
                </button>

                <h4 style="color:#f8fafc; margin-top:0; margin-bottom:30px; font-size:calc(var(--neuro-font-size,21px) * 1.15); font-weight:600; padding-right:120px; letter-spacing:-0.5px;">
                    ${formatBionicText(baseHeading)}
                </h4>
                <ul style="color:#cbd5e1; font-size:var(--neuro-font-size,21px); line-height:var(--neuro-line-height,1.8); margin:0; padding-left:15px; list-style-type:none; font-weight:300;">
                    ${bulletsHtml}
                </ul>
            </div>
        `;
    });

    chunkBox.innerHTML += html;
}
