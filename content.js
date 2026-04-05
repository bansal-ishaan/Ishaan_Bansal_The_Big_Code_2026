// Functions for processing page content and making it readable.
// Note: These are inlined here because Chrome extensions run them as classic scripts.

// Bionic Reading: Bolds the start of words to help the brain scan text faster
function formatBionicText(text) {
    if (!text) return '';
    // Clean redundant spaces that might be hallucinated or extracted incorrectly
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    return cleanText.split(' ').map(word => {
        if (word.includes('<') || word.length === 0)
            return `<span class="neuro-tts-word">${word}</span>`;

        const cleanLen  = word.replace(/[^a-zA-Z0-9]/g, '').length;
        if (cleanLen === 0)
            return `<span class="neuro-tts-word">${word}</span>`;

        const boldCount = cleanLen === 1 ? 1 : Math.ceil(cleanLen / 2);
        let bPart = '', rPart = '', letterCount = 0;

        for (const ch of word) {
            if (/[a-zA-Z0-9]/.test(ch)) letterCount++;
            if (letterCount <= boldCount) bPart += ch;
            else rPart += ch;
        }
        return `<span class="neuro-tts-word"><b class="neuro-bionic" style="font-weight:inherit;">${bPart}</b>${rPart}</span>`;
    }).join(' ');
}

// Focus Mode: Pauses videos and blurs images so they don't distract you
function applyMediaControl() {
    document.querySelectorAll('video').forEach(v => {
        v.pause();
        v.autoplay = false;
        v.removeAttribute('autoplay');
    });
    if (!document.getElementById('neuro-media-control')) {
        const style = document.createElement('style');
        style.id = 'neuro-media-control';
        style.innerHTML = `
            img, video, iframe { filter: blur(10px) grayscale(50%) !important; transition: filter 0.3s ease !important; }
            img:hover, video:hover, iframe:hover { filter: blur(0px) grayscale(0%) !important; }
        `;
        document.head.appendChild(style);
    }
}

// Cognitive Score: Measures how complex or cluttered a page is
function calculateCognitiveLoad(contentMap) {
    if (!contentMap.length)
        return { overallLoad: 0, readingGrade: 0, clutterMetric: 0, message: 'No text extracted.' };

    const totalText = contentMap.filter(t => t.tag !== 'IMG').map(t => t.text).join(' ');
    const sentences = totalText.split(/[.!?]+/).filter(Boolean).length || 1;
    const words     = totalText.split(/\s+/).filter(Boolean).length    || 1;

    let syllables = 0;
    totalText.split(/\s+/).forEach(w => {
        const m = w.match(/[aeiouy]{1,2}/gi);
        let c = m ? m.length : 1;
        if (w.endsWith('e')) c--;
        syllables += Math.max(c, 1);
    });

    let readingGrade = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
    readingGrade = Math.max(0, Math.min(Math.round(readingGrade * 10) / 10, 20));

    const linksOnPage = document.querySelectorAll('a').length;
    const loadScore   = (readingGrade * 4.5) + (linksOnPage * 0.05);

    return {
        overallLoad:   Math.round(Math.min(loadScore, 100)),
        readingGrade,
        clutterMetric: linksOnPage,
        message: loadScore > 65 ? 'High Cognitive Load — simplification recommended.' : 'Manageable complexity.',
    };
}

// Content Extraction: Pulls the main article text while ignoring ads and sidebars
function extractAndTagContent() {
    const mainContainer =
        document.querySelector('[role="main"]')     ||
        document.querySelector('#mw-content-text')  ||
        document.querySelector('.mw-parser-output') ||
        document.querySelector('.markdown-body')    ||
        document.querySelector('article')           ||
        document.querySelector('main')              ||
        document.body;

    const SELECTORS = [
        'p','h1','h2','h3','h4','h5','h6','blockquote','li','dl','dt','dd','figure','figcaption','details','summary','pre','code',
        '.p-note','[data-testid="user-profile-bio"]','.markdown-body p','.markdown-body li','.markdown-body h1','.markdown-body h2','.markdown-body h3',
        '.mw-parser-output > p','.mw-parser-output h2','.mw-parser-output h3',
        '.wp-block-post-title','.wp-block-post-title a','.wp-block-post-excerpt__excerpt','.wp-block-post-excerpt p','.wp-block-post-excerpt__content p','.wp-block-paragraph',
        'a.wp-block-post-title__link','.wp-block-post','.entry-title','.entry-content p','.post-content p',
        '[data-component="text-block"] p','[data-testid="article-body-content"] p',
        '.article__content p','.zn-body__paragraph','.body-text p','[class*="article-body"] p',
        '[data-testid="article-body"] p','section[name="articleBody"] p',
        '[data-gu-name="body"] p','.content__article-body p',
        '.article-body__content p','[class*="ArticleBody"] p',
        '.duet--article--article-body-component p','[data-chorus-optimize="entry-body"] p','.c-entry-content p',
        '.body__inner-container p','[class*="ArticleBodyExperimental"] p',
        '.article-guts p','#article-body p','.pw-post-body-paragraph','[data-selectable-paragraph]','article section p',
        '.available-content p','[class*="post-content"] p','shreddit-post','[data-testid="post-content"] p','.RichTextJSON-root p','.md p',
        '.question-body p','.answer-body p','.s-prose p','#question-header h1',
        '.fatitem td p','.comment p','.storylink','.crayons-article__body p','.prose p','.blog-content p',
        '.feed-shared-text span[dir="ltr"]','.article-content p','.theme-admonition','.alert','.markdown p',
        '.Normal p','._3WlLe p','.arttxt p','.sp-cn p','.Art-exp p',
        '.articlebodycontent p','.full-details p','.detail p','.storyDetail p',
        '.caas-body p','[data-qa="article-body"] p','.article-body p','.story-body p','.content-body p','.page-content p','main p','article p',
    ].join(', ');

    const elements = mainContainer.querySelectorAll(SELECTORS);

    const WIKI_JUNK    = /(navbox|infobox|hatnote|reflist|reference|refbegin|toc|mw-editsection|mw-references|catlinks|sistersitebox|metadata|noprint|stub|portal|authority-control)/;
    const GENERIC_JUNK = /(ad-|ads-|advertisement|promo|related|sidebar|footer|-ad-|social-share|newsletter-signup|cookie-banner|related-posts)/;

    const WIKI_ANCESTORS = [
        '.navbox','.infobox','.hatnote','.reflist','.mw-references-wrap','#toc','.toc','.catlinks','.sistersitebox','.portal','table.wikitable',
    ];
    const ARIA_EXCLUDES = [
        'aside','nav','footer','header','.sidebar','[role="navigation"]','[role="banner"]','[role="complementary"]','[role="contentinfo"]','[role="search"]',
    ];

    const extractedData = [];
    let counter = 0;

    for (const el of elements) {
        if (extractedData.length >= 120) break;

        const combined = `${el.className || ''} ${el.id || ''}`.toLowerCase();
        if (GENERIC_JUNK.test(combined) || WIKI_JUNK.test(combined)) continue;
        if (WIKI_ANCESTORS.some(sel => el.closest(sel)))            continue;
        if (ARIA_EXCLUDES.some(sel  => el.closest(sel)))            continue;
        if (window.getComputedStyle?.(el)?.display === 'none')      continue;

        const isCode  = el.tagName === 'CODE' || el.tagName === 'PRE';
        const isMedia = el.tagName === 'IMG'  || el.tagName === 'PICTURE';
        let textContent = '', imgSrc = null;

        if (isMedia) {
            imgSrc = el.src || '';
            const isGH = !!el.closest('.markdown-body');
            if (!isGH) {
                if (/ad|server|banner|logo|tracker|pixel|icon|button/i.test(imgSrc) || imgSrc.length < 10) continue;
            }
            textContent = el.alt || 'Media Component';
            if (!isGH && textContent.length < 5) continue;
        } else {
            textContent = (el.innerText || el.textContent || '').trim();
            if (!isCode && textContent.length <= 20) continue;
            const isHeading = /^H[1-6]$/.test(el.tagName);
            if (isHeading && (textContent.length < 30 || (!/[.,:;!?]/.test(textContent) && textContent.split(' ').length <= 4))) continue;
            if (el.tagName === 'LI' && textContent.length < 40) continue;
        }

        const elemId = `neuro-id-${counter++}`;
        el.setAttribute('data-neuro-id', elemId);
        if (isCode) el.setAttribute('data-neuro-protect', 'true');

        extractedData.push({ id: elemId, tag: el.tagName, text: textContent, src: imgSrc, protect: isCode });
    }

    const scorer = calculateCognitiveLoad(extractedData);
    injectZenReader(scorer);

    return { title: document.title, url: window.location.href, cognitiveScore: scorer, contentMap: extractedData };
}

// Zen Reader UI - LIGHT MODE VERSION
function injectZenReader(scorer) {
    const existing = document.getElementById('neuro-zen-overlay');
    if (existing) { existing.style.display = 'flex'; document.body.style.overflow = 'hidden'; return; }

    if (!document.getElementById('neuro-font')) {
        const link = Object.assign(document.createElement('link'), {
            id: 'neuro-font', rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap'
        });
        document.head.appendChild(link);
    }

    const overlay = document.createElement('div');
    overlay.id = 'neuro-zen-overlay';
    overlay.innerHTML = buildReaderShell(scorer.overallLoad);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    wireAllControls(overlay);
}

function buildReaderShell(load) {
    return `
    <div id="neuro-root-wrapper" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#f8fafc;color:#1e293b;z-index:2147483647;display:flex;flex-direction:column;font-family:'Outfit',sans-serif;overflow:hidden;--neuro-font-size:21px;--neuro-line-height:1.8;">
        
        <!-- HEADER -->
        <div style="position:absolute;top:0;left:0;width:100vw;padding:25px 50px;background:rgba(255,255,255,0.85);backdrop-filter:blur(20px);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;z-index:20;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:18px;margin-right:40px;">
                <div style="width:38px;height:38px;border-radius:12px;background:#3b82f6;display:flex;justify-content:center;align-items:center;font-size:20px;box-shadow:0 4px 10px rgba(59,130,246,0.3);">✨</div>
                <h1 style="margin:0;font-size:28px;font-weight:700;color:#0f172a;letter-spacing:-1px;">Synapse</h1>
            </div>
            
            <div style="display:flex;gap:40px;align-items:center;flex:1;justify-content:flex-end;">
                <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);padding:8px 18px;border-radius:30px;font-weight:600;color:#2563eb;font-size:14px;display:flex;align-items:center;gap:8px;white-space:nowrap;">
                    <span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>Cognitive Load: ${load}
                </div>
                <div style="display:flex;gap:12px;align-items:center;">
                    ${button('neuro-guide-toggle','ℹ️ Guide')}
                    ${button('neuro-close-btn','Close Reader ✕', true)}
                </div>
            </div>
        </div>


        <style>
            #neuro-root-wrapper *::-webkit-scrollbar{width:14px}
            #neuro-root-wrapper *::-webkit-scrollbar-track{background:#f1f5f9;border-radius:10px}
            #neuro-root-wrapper *::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px;border:4px solid transparent;background-clip:padding-box}
            #neuro-root-wrapper *::-webkit-scrollbar-thumb:hover{background:#94a3b8}
            #neuro-root-wrapper input:checked+.neuro-switch{background-color:#3b82f6!important}
            #neuro-root-wrapper input:not(:checked)+.neuro-switch{background-color:#94a3b8!important}
            #neuro-root-wrapper input:checked+.neuro-switch .neuro-knob{transform:translateX(18px)!important}
            #neuro-root-wrapper.use-dyslexic,#neuro-root-wrapper.use-dyslexic *{font-family:'Comic Sans MS','OpenDyslexic',sans-serif!important;letter-spacing:1px!important}
            #neuro-root-wrapper.use-bionic .neuro-bionic{font-weight:800!important;color:#0f172a}
            #neuro-root-wrapper .neuro-tts-word { transition: background-color 0.2s, box-shadow 0.2s; display:inline; border-radius:4px; position:relative; }
            #neuro-root-wrapper .neuro-highlight { background-color: rgba(59,130,246,0.2) !important; color: #1e3a8a !important; box-shadow: 0 0 10px rgba(59,130,246,0.1), 0 0 4px rgba(59,130,246,0.1) !important; z-index: 2; padding: 0 4px; display: inline-block; }
            #neuro-root-wrapper .neuro-tts-btn { opacity:0; pointer-events:none; transform:translateY(5px); transition:0.3s cubic-bezier(0.16,1,0.3,1); }
            #neuro-root-wrapper .neuro-ai-metadata-card:hover .neuro-tts-btn, #neuro-root-wrapper .neuro-ai-card:hover .neuro-tts-btn, 
            #neuro-root-wrapper .speaking-now .neuro-tts-btn { opacity:1; pointer-events:auto; transform:translateY(0); }
            #neuro-root-wrapper .neuro-ai-card:hover { transform:translateY(-4px); box-shadow:0 12px 24px rgba(0,0,0,0.06); }
            @keyframes slideUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
        </style>

        ${buildSettingsPanel()}
        ${buildGuideModal()}

        <div style="flex:1;display:flex;overflow:hidden;margin-top:90px;">
            <!-- TYPOGRAPHY SIDEBAR (left) -->
            <div id="neuro-typo-sidebar" style="flex:0 0 220px;padding:30px 20px;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;gap:30px;background:#fff;overflow-y:auto;">
                <div>
                    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:16px;">Text Size</div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:#1e293b;font-weight:600;"><span>Size</span><span id="neuro-size-val" style="color:#3b82f6;">21px</span></div>
                    <input type="range" id="neuro-slider-size" min="16" max="36" value="21" style="width:100%;accent-color:#3b82f6;cursor:pointer;height:5px;">
                </div>
                <div>
                    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:16px;">Line Spacing</div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:#1e293b;font-weight:600;"><span>Spacing</span><span id="neuro-space-val" style="color:#3b82f6;">1.8</span></div>
                    <input type="range" id="neuro-slider-space" min="1.2" max="3.0" step="0.1" value="1.8" style="width:100%;accent-color:#3b82f6;cursor:pointer;height:5px;">
                </div>
                <div style="border-top:1px solid #f1f5f9;padding-top:18px;">
                    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:14px;">Controls</div>
                    ${quickToggle('neuro-toggle-dyslexic', 'Dyslexic', false)}
                    <div style="margin-top:12px;"></div>
                    ${quickToggle('neuro-toggle-bionic', 'Bionic', false)}
                    <div style="margin-top:12px;"></div>
                    ${quickToggle('neuro-toggle-media', 'Focus', true)}
                    <div style="margin-top:12px;"></div>
                    ${quickToggle('neuro-toggle-tts', 'Show TTS', true)}
                </div>
            </div>

            <!-- MAIN CONTENT AREA -->
            <div style="flex:1;padding:50px 60px 100px;overflow-y:auto;scroll-behavior:smooth;">
                <div id="neuro-right-content"></div>
            </div>
        </div>
    </div>`;
}

function button(id, text, isClose = false) {
    const bg = isClose ? 'background:#fee2e2;color:#ef4444;border:1px solid #fecaca;' : 'background:#fff;color:#475569;border:1px solid #e2e8f0;';
    return `<button id="${id}" style="${bg}padding:10px 18px;border-radius:24px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:0.2s;white-space:nowrap;">${text}</button>`;
}

function quickToggle(id, label, on) {
    return `
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</span>
            <label style="position:relative;display:inline-block;width:38px;height:20px;margin:0;">
                <input type="checkbox" id="${id}" ${on ? 'checked' : ''} style="opacity:0;width:0;height:0;margin:0;">
                <span class="neuro-switch" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:34px;transition:.4s;">
                    <div class="neuro-knob" style="position:absolute;height:14px;width:14px;left:3px;bottom:3px;background-color:white;border-radius:50%;transition:.4s;"></div>
                </span>
            </label>
        </div>`;
}

function buildSettingsPanel() {
    return `
        <div id="neuro-settings-panel" style="position:absolute;top:95px;right:50px;background:rgba(255,255,255,0.97);backdrop-filter:blur(30px);border:1px solid #e2e8f0;border-radius:24px;padding:24px;width:260px;z-index:15;box-shadow:0 20px 50px rgba(0,0,0,0.1);opacity:0;pointer-events:none;transform:translateY(-15px);transition:0.4s cubic-bezier(0.16,1,0.3,1);">
            <h3 style="margin-top:0;margin-bottom:15px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">More Options</h3>
            <p style="font-size:13px;color:#94a3b8;margin:0;">Typography controls are in the left sidebar. All toggles are available in the top bar and sidebar.</p>
        </div>`;
}

function buildGuideModal() {
    const item = (t, b) => `<div style="margin-bottom:20px;"><strong style="color:#2563eb;font-size:15px;">${t}</strong><p style="margin:4px 0 0;font-size:14px;font-weight:300;line-height:1.5;color:#475569;">${b}</p></div>`;
    return `
        <div id="neuro-guide-modal" style="position:absolute;top:0;left:0;width:100vw;height:100vh;background:rgba(255,255,255,0.7);z-index:50;display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px);">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:40px;width:480px;max-width:90vw;box-shadow:0 30px 60px rgba(0,0,0,0.1);position:relative;">
                <button id="neuro-close-guide" style="position:absolute;top:20px;right:22px;background:transparent;color:#64748b;border:none;font-size:22px;cursor:pointer;">✕</button>
                <h2 style="margin-top:0;color:#0f172a;margin-bottom:25px;">How to use Synapse</h2>
                ${item('✨ Cognitive Load',   'The higher the score, the more your brain was working before Synapse cleaned the page.')}
                ${item('🔊 Integrated TTS',   "Hover any card and click 'Speak'. We use karaoke highlighting to help you stay on track.")}
                ${item('🧠 Multi-Mode',       "Choose between Bionic (word scanning) and Dyslexic (font spacing) depending on your needs.")}
                ${item('😏 Emotional Cues',   "Icons next to text help you understand context and emotion without needing to 'read between the lines'.")}
            </div>
        </div>`;
}

function wireAllControls(overlay) {
    const w = document.getElementById('neuro-root-wrapper');

    document.getElementById('neuro-guide-toggle').onclick = () => { document.getElementById('neuro-guide-modal').style.display = 'flex'; };
    document.getElementById('neuro-close-guide').onclick  = () => { document.getElementById('neuro-guide-modal').style.display = 'none'; };

    document.getElementById('neuro-slider-size').oninput = e => {
        document.getElementById('neuro-size-val').innerText = e.target.value + 'px';
        w.style.setProperty('--neuro-font-size', e.target.value + 'px');
    };
    document.getElementById('neuro-slider-space').oninput = e => {
        document.getElementById('neuro-space-val').innerText = e.target.value;
        w.style.setProperty('--neuro-line-height', e.target.value);
    };

    document.getElementById('neuro-toggle-tts').onchange      = e => w.classList.toggle('hide-tts', !e.target.checked);
    document.getElementById('neuro-toggle-dyslexic').onchange = e => w.classList.toggle('use-dyslexic', e.target.checked);
    document.getElementById('neuro-toggle-bionic').onchange   = e => w.classList.toggle('use-bionic', e.target.checked);
    document.getElementById('neuro-toggle-media').onchange    = e => {
        const s = document.getElementById('neuro-media-control');
        if (s) s.innerHTML = e.target.checked ? 'img,video,iframe{filter:blur(10px) grayscale(50%)!important;transition:filter 0.3s ease!important}img:hover,video:hover,iframe:hover{filter:none!important}' : 'img,video,iframe{filter:none!important}';
    };

    document.getElementById('neuro-close-btn').onclick = () => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        let b = document.getElementById('neuro-restore-btn');
        if (!b) {
            b = document.createElement('button');
            b.id = 'neuro-restore-btn';
            b.innerHTML = '<span style="font-size:16px;">✨</span> Restore Zen';
            b.style.cssText = `
                position:fixed;bottom:32px;right:32px;
                background:#1e293b;color:#f8fafc;
                border:1px solid rgba(255,255,255,0.12);
                padding:14px 24px;border-radius:40px;
                font-weight:700;font-size:15px;cursor:pointer;
                z-index:2147483647;
                box-shadow:0 8px 24px rgba(0,0,0,0.3);
                display:flex;align-items:center;gap:8px;
                font-family:'Outfit',sans-serif;
                transition:transform 0.2s,box-shadow 0.2s;
            `;
            b.onmouseenter = () => { b.style.transform = 'scale(1.05)'; b.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'; };
            b.onmouseleave = () => { b.style.transform = 'scale(1)';    b.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; };
            b.onclick = () => { overlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; b.style.display = 'none'; };
            document.body.appendChild(b);
        } else b.style.display = 'flex';
    };
}

const EMOTION_MAP = {
    sarcastic: { color:'#d97706', bg:'#fef3c7', border:'#fde68a', emoji:'😏' },
    angry:     { color:'#dc2626', bg:'#fee2e2', border:'#fecaca', emoji:'😠' },
    excited:   { color:'#059669', bg:'#d1fae5', border:'#a7f3d0', emoji:'🤩' },
    fearful:   { color:'#7c3aed', bg:'#f3e8ff', border:'#ddd6fe', emoji:'😨' },
    sad:       { color:'#2563eb', bg:'#dbeafe', border:'#bfdbfe', emoji:'😔' },
    urgent:    { color:'#ea580c', bg:'#ffedd5', border:'#fed7aa', emoji:'⚠️' },
    humorous:  { color:'#ca8a04', bg:'#fef9c3', border:'#fef08a', emoji:'😄' },
    critical:  { color:'#e11d48', bg:'#fff1f2', border:'#ffe4e6', emoji:'🔴' },
    neutral:   { color:'#4b5563', bg:'#f3f4f6', border:'#e5e7eb', emoji:'💬' },
};

function initRightPanel() {
    const pane = document.getElementById('neuro-right-content');
    if (pane) pane.innerHTML = `<div id="neuro-ai-metadata"></div><div id="neuro-ai-chunks" style="margin-top:50px;"></div><div id="neuro-ai-status" style="text-align:center;margin-top:80px;padding:40px;background:#f8fafc;border-radius:24px;border:1px dashed #e2e8f0;"><h3 id="neuro-status-text" style="color:#3b82f6;font-size:20px;font-weight:300;margin:0;">Analyzing page with Groq AI...</h3></div>`;
}

function updateAIStatus(msg) {
    const el = document.getElementById('neuro-status-text'), box = document.getElementById('neuro-ai-status');
    if (el) el.innerText = msg;
    if (msg === 'Done!' && box) box.style.display = 'none';
}

function renderAIMetadata(data) {
    const box = document.getElementById('neuro-ai-metadata');
    if (!box) return;
    if (data.error) {
        box.innerHTML = `<div style="text-align:center;color:#ef4444;padding:40px;background:#fef2f2;border-radius:24px;border:1px solid #fecaca;"><h2>Rate Limit Exceeded</h2><p>${data.error}</p><button onclick="window.location.reload()" style="background:#ef4444;color:white;border:none;padding:12px 30px;border-radius:30px;cursor:pointer;">Retry</button></div>`;
        return;
    }
    const safe = (data.page_summary || '').replace(/"/g, '&quot;');
    box.innerHTML = `
        <div class="neuro-ai-metadata-card" style="display:flex;gap:24px;margin-bottom:50px;animation:slideUp 0.7s forwards;align-items:stretch;">
            <!-- FULL-WIDTH LEFT SUMMARY -->
            <div style="flex:1;background:#fff;border:1px solid #e2e8f0;padding:50px 60px;border-radius:32px;border-left:4px solid #3b82f6;box-shadow:0 8px 30px rgba(0,0,0,0.04);display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
                <h3 style="color:#3b82f6;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 25px;font-weight:800;">📝 Quick Summary</h3>
                <p style="font-size:var(--neuro-font-size,22px);color:#1e293b;font-weight:400;line-height:1.6;margin:0;">${formatBionicText(data.page_summary)}</p>
                <div style="margin-top:30px;">
                    <button class="neuro-tts-btn" data-text="${safe}" style="background:rgba(59,130,246,0.1);color:#2563eb;border:1px solid rgba(59,130,246,0.2);padding:12px 28px;border-radius:30px;cursor:pointer;font-size:15px;font-weight:700;font-family:'Outfit',sans-serif;transition:0.3s;">🔊 Listen to Summary</button>
                </div>
            </div>

            <!-- TONE BOX ON RIGHT -->
            <div style="flex:0 0 160px;background:#f1f5f9;border:1px solid #e2e8f0;padding:30px 10px;border-radius:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
                <span style="font-weight:800;color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;margin-bottom:15px;">Tone Check</span>
                <div style="font-size:22px;font-weight:700;color:#0f172a;text-transform:capitalize;">${data.page_tone || 'Neutral'}</div>
                <div style="margin-top:10px;font-size:30px;opacity:0.8;">${(EMOTION_MAP[(data.page_tone || '').toLowerCase()] || EMOTION_MAP.neutral).emoji}</div>
            </div>
        </div>`;
}

function renderAIChunk(data) {
    const box = document.getElementById('neuro-ai-chunks');
    if (!box || data.error) return;
    let html = '';
    (data.simplified_chunks || []).forEach(chunk => {
        const emotion = (chunk.emotion || 'neutral').toLowerCase();
        const emo = EMOTION_MAP[emotion] || EMOTION_MAP.neutral;
        const heading = chunk.heading || 'Insight';
        const bullets = chunk.bullet_points || [];
        const safe = [heading, ...bullets].join(' ').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        html += `
            <div class="neuro-ai-card" style="margin-bottom:30px;animation:slideUp 0.6s forwards;background:#fff;border:1px solid #e2e8f0;padding:40px;border-radius:28px;position:relative;transition:0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.02);">
                <div style="display:inline-flex;align-items:center;gap:6px;background:${emo.bg};border:1px solid ${emo.border};color:${emo.color};padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:18px;"><span>${emo.emoji}</span><span>${emotion}</span></div>
                <button class="neuro-tts-btn" data-text="${safe}" style="position:absolute;top:30px;right:30px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:10px 20px;border-radius:24px;cursor:pointer;font-size:13px;font-weight:600;transition:0.2s;font-family:'Outfit',sans-serif;">🔊 Speak</button>
                <h4 style="color:#0f172a;margin:0 0 25px;font-size:calc(var(--neuro-font-size,21px) * 1.1);font-weight:600;padding-right:100px;letter-spacing:-0.4px;">${formatBionicText(heading)}</h4>
                <ul style="color:#334155;font-size:var(--neuro-font-size,21px);line-height:1.8;margin:0;padding-left:15px;list-style-type:none;font-weight:300;">
                    ${bullets.map(bp => `<li style="margin-bottom:14px;display:flex;gap:15px;"><span style="color:#3b82f6;font-weight:700;margin-top:2px;">→</span><span>${formatBionicText(bp)}</span></li>`).join('')}
                </ul>
            </div>`;
    });
    box.innerHTML += html;
}

let _currentButton = null;

function stopCurrentTTS() {
    window.speechSynthesis.cancel();
    if (_currentButton) {
        // Restore label based on which card type it's in
        _currentButton.innerText = _currentButton.closest('.neuro-ai-metadata-card') ? '🔊 Listen to Summary' : '🔊 Speak';
        const card = _currentButton.closest('.neuro-ai-card, .neuro-ai-metadata-card');
        if (card) {
            card.classList.remove('speaking-now');
            card.querySelectorAll('.neuro-tts-word').forEach(w => w.classList.remove('neuro-highlight'));
        }
        _currentButton = null;
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.neuro-tts-btn');
        if (!btn) return;

        const text = btn.getAttribute('data-text');
        if (!text) return;

        // ── STOP: currently active button clicked again ───────────────────────
        if (_currentButton === btn) {
            stopCurrentTTS();
            return;
        }

        // ── SWITCH: a different card's button was clicked ─────────────────────
        stopCurrentTTS();

        // ── START: fresh playback ─────────────────────────────────────────────
        _currentButton = btn;
        btn.innerText  = '⏹ Stop';

        const card = btn.closest('.neuro-ai-card, .neuro-ai-metadata-card');
        if (card) card.classList.add('speaking-now');

        const utt  = new SpeechSynthesisUtterance(text);
        utt.lang   = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US';
        utt.rate   = 0.9;

        // Collect ALL word-spans inside this card for karaoke highlighting
        const words = card ? Array.from(card.querySelectorAll('.neuro-tts-word')) : [];

        utt.onboundary = ev => {
            if (ev.name !== 'word') return;
            // Clear previous highlight
            words.forEach(w => w.classList.remove('neuro-highlight'));
            // ev.charIndex = START position of current word in the utterance text
            // Words BEFORE it = count of words in substring → that IS the current word's index
            const before = text.substring(0, ev.charIndex).trim();
            const idx    = before.length === 0 ? 0 : before.split(/\s+/).filter(Boolean).length;
            if (words[idx]) words[idx].classList.add('neuro-highlight');
        };

        utt.onend = () => { stopCurrentTTS(); };
        utt.onerror = () => { stopCurrentTTS(); };

        window.speechSynthesis.speak(utt);
    });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((req, _s, res) => {
        if (req.action === 'extract_dom') { applyMediaControl(); const d = extractAndTagContent(); initRightPanel(); res(d); }
        else if (req.action === 'update_status') updateAIStatus(req.message);
        else if (req.action === 'render_ai_metadata') renderAIMetadata(req.data);
        else if (req.action === 'render_ai_chunk') renderAIChunk(req.data);
        else if (req.action === 'start_vision_analysis') {
            res({ status: 'ok' });
            startVisionLens();
        }
        else if (req.action === 'vision_captured') {
            // Background captured screenshot — safe to show loading overlay now
            showVisionLoading();
        }
        else if (req.action === 'vision_analysis_result') {
            if (req.error) {
                showLensError('Vision AI error: ' + req.error);
            } else if (req.description) {
                renderVisionOverlay(req.description, req.imageUrl);
            }
        }
        return true;
    });
}

// ── VISUAL ANALYZER ─────────────────────────────────────────────────────────

let _visionTTSUtt = null;

function renderVisionOverlay(descriptionText, dataUrl) {
    if (_visionTTSUtt) window.speechSynthesis.cancel();

    injectZenReader({ overallLoad: 'Visual' });

    const contentDiv = document.getElementById('neuro-right-content');
    if (!contentDiv) { console.error('[Synapse Vision] neuro-right-content not found'); return; }

    // ── Remove Focus toggle and Settings button ────────────────────────────────────
    document.getElementById('neuro-settings-toggle')?.remove();
    // Hide the Focus toggle row in sidebar
    const focusRow = document.getElementById('neuro-toggle-media')?.closest('div[style]');
    if (focusRow) focusRow.style.display = 'none';

    // ── Parse structured response into sections ─────────────────────────────────
    function parseSection(text, heading) {
        const re = new RegExp(heading + ':?\\s*([\\s\\S]*?)(?=OVERVIEW:|KEY ELEMENTS:|WHAT IT MEANS:|$)', 'i');
        const m  = text.match(re);
        return m ? m[1].trim() : '';
    }
    const overview  = parseSection(descriptionText, 'OVERVIEW');
    const elements  = parseSection(descriptionText, 'KEY ELEMENTS');
    const meaning   = parseSection(descriptionText, 'WHAT IT MEANS');

    function renderBullets(raw) {
        if (!raw) return '';
        return raw.split(/\n/).filter(l => l.trim()).map(l => {
            const clean = l.replace(/^[-\u2022*]\s*/, '');
            return `<li style="margin-bottom:10px;display:flex;gap:12px;"><span style="color:#3b82f6;font-weight:700;flex-shrink:0;">→</span><span>${formatBionicText(clean)}</span></li>`;
        }).join('');
    }

    function section(icon, title, content, isBullet) {
        if (!content) return '';
        return `
            <div style="margin-bottom:28px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <span style="font-size:16px;">${icon}</span>
                    <h4 style="margin:0;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">${title}</h4>
                </div>
                ${ isBullet
                    ? `<ul style="margin:0;padding:0;list-style:none;">${renderBullets(content)}</ul>`
                    : `<p style="margin:0;font-size:var(--neuro-font-size,21px);line-height:var(--neuro-line-height,1.8);color:#1e293b;">${formatBionicText(content)}</p>`
                }
            </div>`;
    }

    // If response is not structured (no headings), fall back to bullet split
    const isStructured = /OVERVIEW|KEY ELEMENTS|WHAT IT MEANS/i.test(descriptionText);
    const bodyHtml = isStructured
        ? section('🔭', 'Overview', overview, false)
        + section('🔑', 'Key Elements', elements, true)
        + section('💡', 'What It Means', meaning, true)
        : `<ul style="margin:0;padding:0;list-style:none;">${renderBullets(descriptionText)}</ul>`;

    contentDiv.innerHTML = `
        <div style="max-width:820px;margin:0 auto;padding-top:32px;">

            <!-- Captured image -->
            <div style="margin-bottom:28px;border-radius:14px;overflow:hidden;
                box-shadow:0 8px 30px rgba(0,0,0,0.12);border:1px solid #e2e8f0;background:#000;
                display:flex;justify-content:center;">
                <img src="${dataUrl}" style="max-width:100%;max-height:52vh;display:block;object-fit:contain;"
                     alt="Selected diagram" />
            </div>

            <!-- Explanation card -->
            <div class="neuro-ai-metadata-card" style="background:#fff;border:1px solid #e2e8f0;
                border-radius:20px;padding:32px;position:relative;margin-bottom:80px;
                box-shadow:0 6px 20px rgba(0,0,0,0.04);">

                <!-- Card header -->
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;
                    padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                    <div style="width:36px;height:36px;border-radius:10px;background:#f0f9ff;
                        display:flex;justify-content:center;align-items:center;font-size:18px;">📊</div>
                    <h3 style="margin:0;font-size:18px;color:#1e293b;font-weight:700;">Vision Explanation</h3>
                    <button class="neuro-tts-btn" data-text="${descriptionText.replace(/"/g, "'")}" style="
                        margin-left:auto;background:rgba(59,130,246,0.1);color:#2563eb;
                        border:1px solid rgba(59,130,246,0.2);padding:6px 16px;border-radius:20px;
                        font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;
                    ">🔊 Listen</button>
                </div>

                <!-- Structured content -->
                <div style="font-size:var(--neuro-font-size,21px);line-height:var(--neuro-line-height,1.8);">
                    ${bodyHtml}
                </div>
            </div>
        </div>
    `;
}

// ── SYNAPSE LENS — SNIPPING TOOL STYLE ──────────────────────────────────────
// User drags a rectangle over any area (like Windows Snip & Sketch).
// On mouse-up the selection is sent as a bounding rect to background.

let _lensActive = false;
let _lensHighlighted = null;

function startVisionLens() {
    if (_lensActive) return;
    _lensActive = true;

    // Ensure font
    if (!document.getElementById('neuro-font')) {
        const link = Object.assign(document.createElement('link'), {
            id: 'neuro-font', rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap'
        });
        document.head.appendChild(link);
    }

    // ── Full-screen dark glass overlay (pointer-events: auto so we intercept mouse) ──
    const glass = document.createElement('div');
    glass.id = 'synapse-snip-glass';
    glass.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(10, 15, 30, 0.6);
        z-index: 2147483640;
        cursor: crosshair;
        user-select: none;
    `;
    document.body.appendChild(glass);

    // ── Selection rectangle ──
    const sel = document.createElement('div');
    sel.id = 'synapse-snip-sel';
    sel.style.cssText = `
        position: fixed;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.12);
        box-shadow: 0 0 0 9999px rgba(10,15,30,0.5);
        display: none;
        z-index: 2147483641;
        pointer-events: none;
        border-radius: 2px;
    `;
    document.body.appendChild(sel);

    // ── Instruction banner ──
    const banner = document.createElement('div');
    banner.id = 'synapse-snip-banner';
    banner.style.cssText = `
        position: fixed; top: 22px; left: 50%; transform: translateX(-50%);
        background: #1e293b; color: #f8fafc;
        padding: 12px 22px; border-radius: 40px;
        font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
        z-index: 2147483647; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
        pointer-events: auto; white-space: nowrap;
    `;
    banner.innerHTML = `
        <span style="font-size:18px;">✂️</span>
        <span>Drag to select the diagram, then release</span>
        <button id="synapse-snip-cancel" style="
            margin-left:14px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2);
            color:#f8fafc; padding:5px 14px; border-radius:20px; cursor:pointer;
            font-family:'Outfit',sans-serif; font-size:12px; font-weight:600;
        ">Cancel ✕</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('synapse-snip-cancel').onclick = () => teardownLens();

    let startX = 0, startY = 0, dragging = false;

    function onMouseDown(e) {
        if (e.target.closest('#synapse-snip-banner')) return;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        sel.style.left   = startX + 'px';
        sel.style.top    = startY + 'px';
        sel.style.width  = '0px';
        sel.style.height = '0px';
        sel.style.display = 'block';
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!dragging) return;
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        sel.style.left   = x + 'px';
        sel.style.top    = y + 'px';
        sel.style.width  = w + 'px';
        sel.style.height = h + 'px';
        e.preventDefault();
    }

    function onMouseUp(e) {
        if (!dragging) return;
        dragging = false;

        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);

        if (w < 30 || h < 30) {
            showLensError('Selection too small — drag a larger area over the diagram.');
            sel.style.display = 'none';
            return;
        }

        // Update banner to show processing state
        banner.innerHTML = `<span style="font-size:18px;">⏳</span><span>Analyzing your selection with Vision AI…</span>`;

        const lang = document.documentElement.lang || 'English';
        const dpr  = window.devicePixelRatio || 1;

        // Fire to background — it will capture (BEFORE showing overlay) then crop + run Groq
        chrome.runtime.sendMessage({
            action: 'analyze_element',
            rect: { x, y, w, h },
            dpr,
            language: lang,
        });

        // Tear down the snip UI — loading overlay shown when background acks via vision_captured
        teardownLens(false);
        // NOTE: do NOT call showVisionLoading() here — it would corrupt the screenshot!
    }

    glass.addEventListener('mousedown', onMouseDown);
    glass.addEventListener('mousemove', onMouseMove);
    glass.addEventListener('mouseup',   onMouseUp);

    window.__synapseLen = { glass, onMouseDown, onMouseMove, onMouseUp };
}

function showVisionLoading() {
    // Spin up the Zen Reader with a loading card while Groq processes
    const dummyScorer = { overallLoad: 'Visual', readingGrade: 0, clutterMetric: 0 };
    injectZenReader(dummyScorer);
    const contentDiv = document.getElementById('neuro-right-content');
    if (!contentDiv) return;
    contentDiv.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 40px;gap:24px;">
            <div style="
                width:64px;height:64px;border-radius:50%;
                border:4px solid #e2e8f0;border-top-color:#3b82f6;
                animation:synapse-spin 0.8s linear infinite;
            "></div>
            <h3 style="color:#3b82f6;font-size:20px;font-weight:400;margin:0;">Analyzing diagram with Vision AI…</h3>
            <p style="color:#94a3b8;font-size:14px;margin:0;">This usually takes 3–8 seconds</p>
            <style>@keyframes synapse-spin{to{transform:rotate(360deg)}}</style>
        </div>
    `;
}

function teardownLens(showCancelled = true) {
    _lensActive = false;
    _lensHighlighted = null;

    document.getElementById('synapse-snip-glass')?.remove();
    document.getElementById('synapse-snip-sel')?.remove();
    document.getElementById('synapse-snip-banner')?.remove();
    document.getElementById('synapse-lens-error')?.remove();

    if (window.__synapseLen) {
        const { glass, onMouseDown, onMouseMove, onMouseUp } = window.__synapseLen;
        if (glass) {
            glass.removeEventListener('mousedown', onMouseDown);
            glass.removeEventListener('mousemove', onMouseMove);
            glass.removeEventListener('mouseup',   onMouseUp);
        }
        delete window.__synapseLen;
    }
}

function showLensError(msg) {
    document.getElementById('synapse-lens-error')?.remove();
    const err = document.createElement('div');
    err.id = 'synapse-lens-error';
    err.style.cssText = `
        position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
        background: #ef4444; color: white; padding: 11px 22px;
        border-radius: 30px; font-family: 'Outfit', sans-serif; font-size: 14px;
        font-weight: 600; z-index: 2147483647;
        box-shadow: 0 4px 14px rgba(239,68,68,0.35);
    `;
    err.textContent = msg;
    document.body.appendChild(err);
    setTimeout(() => err.remove(), 3500);
}

if (typeof module !== 'undefined') {
    module.exports = { applyMediaControl, extractAndTagContent, calculateCognitiveLoad, formatBionicText, renderAIMetadata, renderAIChunk, updateAIStatus };
}
