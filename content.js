// Functions for processing page content and making it readable.
// Note: These are inlined here because Chrome extensions run them as classic scripts.

// Bionic Reading: Bolds the start of words to help the brain scan text faster
function formatBionicText(text) {
    if (!text) return '';
    return text.split(' ').map(word => {
        if (word.includes('<') || word.length === 0)
            return `<span class="neuro-tts-word" style="transition:0.15s ease;">${word}</span>`;

        const cleanLen  = word.replace(/[^a-zA-Z0-9]/g, '').length;
        if (cleanLen === 0)
            return `<span class="neuro-tts-word" style="transition:0.15s ease;">${word}</span>`;

        const boldCount = cleanLen === 1 ? 1 : Math.ceil(cleanLen / 2);
        let bPart = '', rPart = '', letterCount = 0;

        for (const ch of word) {
            if (/[a-zA-Z0-9]/.test(ch)) letterCount++;
            if (letterCount <= boldCount) bPart += ch;
            else rPart += ch;
        }
        return `<span class="neuro-tts-word" style="transition:0.15s ease;"><b class="neuro-bionic" style="font-weight:inherit;">${bPart}</b>${rPart}</span>`;
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
        // Universal
        'p','h1','h2','h3','h4','h5','h6','blockquote','li',
        'dl','dt','dd','figure','figcaption','details','summary','pre','code',
        // GitHub
        '.p-note','[data-testid="user-profile-bio"]',
        '.markdown-body p','.markdown-body li','.markdown-body h1','.markdown-body h2','.markdown-body h3',
        // Wikipedia
        '.mw-parser-output > p','.mw-parser-output h2','.mw-parser-output h3',
        // WordPress / The Onion / TechCrunch
        '.wp-block-post-title','.wp-block-post-title a','.wp-block-post-excerpt__excerpt','.wp-block-post-excerpt p','.wp-block-post-excerpt__content p','.wp-block-paragraph',
        'a.wp-block-post-title__link','.wp-block-post',
        '.entry-title','.entry-content p','.post-content p',
        // BBC
        '[data-component="text-block"] p','[data-testid="article-body-content"] p',
        // CNN
        '.article__content p','.zn-body__paragraph','.body-text p','[class*="article-body"] p',
        // NY Times
        '[data-testid="article-body"] p','section[name="articleBody"] p',
        // The Guardian
        '[data-gu-name="body"] p','.content__article-body p',
        // Reuters
        '.article-body__content p','[class*="ArticleBody"] p',
        // The Verge
        '.duet--article--article-body-component p','[data-chorus-optimize="entry-body"] p','.c-entry-content p',
        // Wired
        '.body__inner-container p','[class*="ArticleBodyExperimental"] p',
        // Ars Technica
        '.article-guts p','#article-body p',
        // Medium
        '.pw-post-body-paragraph','[data-selectable-paragraph]','article section p',
        // Substack
        '.available-content p','[class*="post-content"] p',
        // Reddit
        'shreddit-post','[data-testid="post-content"] p','.RichTextJSON-root p','.md p',
        // Stack Overflow
        '.question-body p','.answer-body p','.s-prose p','#question-header h1',
        // Hacker News
        '.fatitem td p','.comment p','.storylink',
        // Dev.to / Hashnode
        '.crayons-article__body p','.prose p','.blog-content p',
        // LinkedIn
        '.feed-shared-text span[dir="ltr"]','.article-content p',
        // Docusaurus / GitBook
        '.theme-admonition','.alert','.markdown p',
        // Indian News (TOI, NDTV, The Hindu, Indian Express, HT)
        '.Normal p','._3WlLe p','.arttxt p','.sp-cn p','.Art-exp p',
        '.articlebodycontent p','.full-details p','.detail p','.storyDetail p',
        // Yahoo News / Washington Post
        '.caas-body p','[data-qa="article-body"] p',
        // General fallbacks
        '.article-body p','.story-body p','.content-body p','.page-content p','main p','article p',
    ].join(', ');

    const elements = mainContainer.querySelectorAll(SELECTORS);

    const WIKI_JUNK    = /(navbox|infobox|hatnote|reflist|reference|refbegin|toc|mw-editsection|mw-references|catlinks|sistersitebox|metadata|noprint|stub|portal|authority-control)/;
    const GENERIC_JUNK = /(ad-|ads-|advertisement|promo|related|sidebar|footer|-ad-|social-share|newsletter-signup|cookie-banner|related-posts)/;

    const WIKI_ANCESTORS = [
        '.navbox','.infobox','.hatnote','.reflist','.mw-references-wrap',
        '#toc','.toc','.catlinks','.sistersitebox','.portal','table.wikitable',
    ];
    const ARIA_EXCLUDES = [
        'aside','nav','footer','header','.sidebar',
        '[role="navigation"]','[role="banner"]','[role="complementary"]',
        '[role="contentinfo"]','[role="search"]',
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
            if (!isCode && textContent.length <= 12) continue;
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

// Zen Reader UI: The overlay that shows the simplified, focused content
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

    const sc = scorer.overallLoad > 65 ? '#fb7185' : scorer.overallLoad > 40 ? '#fbbf24' : '#34d399';
    const overlay = document.createElement('div');
    overlay.id = 'neuro-zen-overlay';
    overlay.innerHTML = buildReaderShell(scorer.overallLoad, sc);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    wireAllControls(overlay);
}

function buildReaderShell(load, sc) {
    return `
    <div id="neuro-root-wrapper" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:radial-gradient(ellipse at 50% -20%,#2e245e 0%,#0f172a 50%,#080b14 100%);color:#cbd5e1;z-index:2147483647;display:flex;flex-direction:column;font-family:'Outfit',sans-serif;overflow:hidden;--neuro-font-size:21px;--neuro-line-height:1.8;">
        <div style="position:absolute;top:0;left:0;width:100vw;padding:25px 50px;background:rgba(15,23,42,0.45);backdrop-filter:blur(28px);border-bottom:1px solid rgba(255,255,255,0.03);display:flex;justify-content:space-between;align-items:center;z-index:20;box-sizing:border-box;box-shadow:0 15px 40px rgba(0,0,0,0.3);">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#a78bfa,#818cf8);display:flex;justify-content:center;align-items:center;font-size:18px;box-shadow:0 4px 15px rgba(167,139,250,0.4);">✨</div>
                <h1 style="margin:0;font-size:26px;font-weight:700;color:#f8fafc;letter-spacing:-0.5px;">Synapse</h1>
            </div>
            <div style="display:flex;gap:24px;align-items:center;">
                <div style="background:${sc}15;border:1px solid ${sc}44;box-shadow:0 0 15px ${sc}44;padding:8px 20px;border-radius:30px;font-weight:600;color:${sc};font-size:14px;display:flex;align-items:center;gap:8px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${sc};display:inline-block;"></span>Cognitive Load: ${load}
                </div>
                <button id="neuro-guide-toggle"    style="background:rgba(255,255,255,0.05);color:white;border:1px solid rgba(255,255,255,0.1);padding:10px 18px;cursor:pointer;border-radius:30px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;transition:0.2s;">ℹ️ Guide</button>
                <button id="neuro-settings-toggle" style="background:rgba(255,255,255,0.05);color:white;border:1px solid rgba(255,255,255,0.1);padding:10px 18px;cursor:pointer;border-radius:30px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;transition:0.2s;">⚙️ Settings</button>
                <button id="neuro-close-btn"       style="background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.15);padding:10px 24px;cursor:pointer;border-radius:30px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;transition:0.2s;">Close Reader ✕</button>
            </div>
        </div>
        <style>
            #neuro-root-wrapper *::-webkit-scrollbar{width:14px}
            #neuro-root-wrapper *::-webkit-scrollbar-track{background:rgba(0,0,0,0.1);border-radius:10px}
            #neuro-root-wrapper *::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.3);border-radius:10px;border:4px solid transparent;background-clip:padding-box}
            #neuro-root-wrapper *::-webkit-scrollbar-thumb:hover{background-color:rgba(167,139,250,0.5)}
            #neuro-root-wrapper input:checked+.neuro-switch{background-color:#c084fc!important}
            #neuro-root-wrapper input:not(:checked)+.neuro-switch{background-color:#475569!important}
            #neuro-root-wrapper input:checked+.neuro-switch .neuro-knob{transform:translateX(20px)!important}
            #neuro-root-wrapper input:not(:checked)+.neuro-switch .neuro-knob{transform:translateX(0)!important}
            #neuro-root-wrapper.hide-tts .neuro-tts-btn{display:none!important}
            #neuro-root-wrapper.use-dyslexic,#neuro-root-wrapper.use-dyslexic *{font-family:'Comic Sans MS','OpenDyslexic',sans-serif!important;letter-spacing:1px!important}
            #neuro-root-wrapper.use-bionic .neuro-bionic{font-weight:800!important;color:#ffffff}
        </style>
        ${buildSettingsPanel()}
        ${buildGuideModal()}
        <div style="flex:1;padding:140px 20px 100px;overflow-y:auto;scroll-behavior:smooth;">
            <div id="neuro-right-content" style="max-width:900px;margin:0 auto;"></div>
        </div>
    </div>`;
}

function buildSettingsPanel() {
    const row = (id, label, on) => `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <span style="font-size:15px;color:#f1f5f9;font-weight:600;">${label}</span>
            <label style="position:relative;display:inline-block;width:44px;height:24px;margin:0;">
                <input type="checkbox" id="${id}" ${on ? 'checked' : ''} style="opacity:0;width:0;height:0;margin:0;">
                <span class="neuro-switch" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;border-radius:34px;background-color:${on ? '#c084fc' : '#475569'};transition:.4s;">
                    <div class="neuro-knob" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background-color:white;border-radius:50%;transition:.4s;${on ? 'transform:translateX(20px);' : ''}"></div>
                </span>
            </label>
        </div>`;
    return `
        <div id="neuro-settings-panel" style="position:absolute;top:95px;right:50px;background:rgba(15,23,42,0.85);backdrop-filter:blur(35px);border:1px solid rgba(167,139,250,0.15);border-radius:28px;padding:35px;width:360px;z-index:15;box-shadow:0 30px 70px rgba(0,0,0,0.6);opacity:0;pointer-events:none;transform:translateY(-15px);transition:0.4s cubic-bezier(0.16,1,0.3,1);">
            <h3 style="margin-top:0;margin-bottom:25px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#a5b4fc;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Typography</h3>
            <div style="margin-bottom:25px;">
                <label style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px;color:#f1f5f9;font-weight:600;"><span>Text Size</span><span id="neuro-size-val" style="color:#818cf8;">21px</span></label>
                <input type="range" id="neuro-slider-size" min="16" max="36" value="21" style="width:100%;accent-color:#c084fc;cursor:pointer;height:6px;">
            </div>
            <div style="margin-bottom:30px;">
                <label style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px;color:#f1f5f9;font-weight:600;"><span>Line Spacing</span><span id="neuro-space-val" style="color:#818cf8;">1.8</span></label>
                <input type="range" id="neuro-slider-space" min="1.2" max="3.0" step="0.1" value="1.8" style="width:100%;accent-color:#c084fc;cursor:pointer;height:6px;">
            </div>
            <h3 style="margin-top:0;margin-bottom:20px;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:#a5b4fc;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:10px;">Accessibility Features</h3>
            ${row('neuro-toggle-dyslexic', 'Dyslexic Font Match',    false)}
            ${row('neuro-toggle-tts',      'Read Aloud Buttons',     true)}
            ${row('neuro-toggle-bionic',   'Bionic Reading Mode',    false)}
            ${row('neuro-toggle-media',    'Dim Distracting Media',  true)}
        </div>`;
}

function buildGuideModal() {
    const item = (t, b) => `<div style="margin-bottom:20px;"><strong style="color:#c084fc;font-size:16px;">${t}</strong><p style="margin:5px 0 0;font-size:14px;font-weight:300;line-height:1.5;color:#cbd5e1;">${b}</p></div>`;
    return `
        <div id="neuro-guide-modal" style="position:absolute;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:50;display:none;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
            <div style="background:rgba(15,23,42,0.95);border:1px solid rgba(129,140,248,0.3);border-radius:20px;padding:40px;width:500px;max-width:90vw;box-shadow:0 30px 60px rgba(0,0,0,0.6);position:relative;">
                <button id="neuro-close-guide" style="position:absolute;top:20px;right:20px;background:transparent;color:white;border:none;font-size:20px;cursor:pointer;">✕</button>
                <h2 style="margin-top:0;color:#a5b4fc;margin-bottom:25px;">Welcome to Synapse!</h2>
                ${item('✨ Cognitive Load Score',   'Shows how complex the original page was before AI simplified it.')}
                ${item('🔊 Karaoke TTS',            "Click 'Speak' — each word highlights in real-time as the voice reads it.")}
                ${item('🧠 Bionic & Dyslexic',      "Settings → Bionic Mode bolds the first half of each word. Dyslexic Mode switches to a more readable font.")}
                ${item('😏 Emotion Badges',          "Each paragraph shows its detected emotional tone so you understand the vibe before the voice says it.")}
                ${item('🌙 Sensory Dimming',         'All autoplaying media is blurred. Hover any image to preview it.')}
            </div>
        </div>`;
}

function wireAllControls(overlay) {
    const w = document.getElementById('neuro-root-wrapper');

    // Settings panel
    const settingsBtn   = document.getElementById('neuro-settings-toggle');
    const settingsPanel = document.getElementById('neuro-settings-panel');
    let panelOpen = false;
    settingsBtn.addEventListener('click', () => {
        panelOpen = !panelOpen;
        settingsPanel.style.opacity       = panelOpen ? '1'             : '0';
        settingsPanel.style.pointerEvents = panelOpen ? 'auto'          : 'none';
        settingsPanel.style.transform     = panelOpen ? 'translateY(0)' : 'translateY(-15px)';
        settingsBtn.style.background      = panelOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    });

    // Guide modal
    const guideModal  = document.getElementById('neuro-guide-modal');
    document.getElementById('neuro-guide-toggle').addEventListener('click', () => { guideModal.style.display = 'flex'; });
    document.getElementById('neuro-close-guide').addEventListener('click',  () => { guideModal.style.display = 'none'; });

    // Sliders
    document.getElementById('neuro-slider-size').addEventListener('input', e => {
        document.getElementById('neuro-size-val').innerText = e.target.value + 'px';
        w.style.setProperty('--neuro-font-size', e.target.value + 'px');
    });
    document.getElementById('neuro-slider-space').addEventListener('input', e => {
        document.getElementById('neuro-space-val').innerText = e.target.value;
        w.style.setProperty('--neuro-line-height', e.target.value);
    });

    // Toggles
    document.getElementById('neuro-toggle-tts').addEventListener('change',      e => w.classList.toggle('hide-tts',     !e.target.checked));
    document.getElementById('neuro-toggle-dyslexic').addEventListener('change', e => w.classList.toggle('use-dyslexic',  e.target.checked));
    document.getElementById('neuro-toggle-bionic').addEventListener('change',   e => w.classList.toggle('use-bionic',    e.target.checked));
    document.getElementById('neuro-toggle-media').addEventListener('change', e => {
        const s = document.getElementById('neuro-media-control');
        if (s) s.innerHTML = e.target.checked
            ? 'img,video,iframe{filter:blur(10px) grayscale(50%)!important;transition:filter 0.3s ease!important}img:hover,video:hover,iframe:hover{filter:none!important}'
            : 'img,video,iframe{filter:none!important}';
    });

    // Close / restore
    const closeBtn = document.getElementById('neuro-close-btn');
    closeBtn.addEventListener('mouseover', () => { closeBtn.style.background = 'rgba(255,255,255,0.15)'; });
    closeBtn.addEventListener('mouseout',  () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; });
    closeBtn.addEventListener('click', () => {
        overlay.style.display        = 'none';
        document.body.style.overflow = '';
        let badge = document.getElementById('neuro-restore-btn');
        if (!badge) {
            badge = document.createElement('button');
            badge.id        = 'neuro-restore-btn';
            badge.innerHTML = '👁️ Restore Zen';
            badge.style.cssText = 'position:fixed;bottom:40px;right:40px;background:linear-gradient(135deg,#818cf8,#a78bfa);color:#fff;border:none;padding:18px 32px;border-radius:40px;font-weight:700;font-family:sans-serif;font-size:16px;cursor:pointer;z-index:2147483647;box-shadow:0 15px 35px rgba(167,139,250,0.4);text-transform:uppercase;letter-spacing:1.5px;transition:0.4s cubic-bezier(0.16,1,0.3,1);';
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

// UI Rendering Helpers: Colors, icons, and layout for the AI results
const EMOTION_MAP = {
    sarcastic: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)',   border:'rgba(245,158,11,0.25)',   emoji:'😏', adverb:'Sarcastically says' },
    angry:     { color:'#fb7185', bg:'rgba(251,113,133,0.1)', border:'rgba(251,113,133,0.25)',  emoji:'😠', adverb:'Angrily says'        },
    excited:   { color:'#34d399', bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.25)',   emoji:'🤩', adverb:'Excitedly says'      },
    fearful:   { color:'#a78bfa', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.25)',  emoji:'😨', adverb:'Fearfully says'      },
    sad:       { color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.25)',   emoji:'😔', adverb:'Sadly says'          },
    urgent:    { color:'#f97316', bg:'rgba(249,115,22,0.1)',  border:'rgba(249,115,22,0.25)',   emoji:'⚠️', adverb:'Urgently says'       },
    humorous:  { color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.25)',   emoji:'😄', adverb:'Humorously says'     },
    critical:  { color:'#f43f5e', bg:'rgba(244,63,94,0.1)',   border:'rgba(244,63,94,0.25)',    emoji:'🔴', adverb:'Critically says'     },
    neutral:   { color:'#94a3b8', bg:'rgba(148,163,184,0.08)',border:'rgba(148,163,184,0.15)',  emoji:'💬', adverb:''                   },
};

function initRightPanel() {
    const pane = document.getElementById('neuro-right-content');
    if (!pane) return;
    pane.innerHTML = `
        <div id="neuro-ai-metadata"></div>
        <div id="neuro-ai-chunks" style="margin-top:50px;"></div>
        <div id="neuro-ai-status" style="text-align:center;margin-top:80px;padding:40px;background:rgba(99,102,241,0.03);border-radius:20px;border:1px dashed rgba(99,102,241,0.2);">
            <div style="font-size:34px;margin-bottom:20px;animation:pulse 2s infinite;">✨</div>
            <h3 id="neuro-status-text" style="color:#818cf8;font-size:20px;font-weight:300;margin:0;">Waking up LPU core...</h3>
        </div>`;
    if (!document.getElementById('neuro-animations')) {
        const s = document.createElement('style');
        s.id = 'neuro-animations';
        s.innerHTML = '@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}';
        document.head.appendChild(s);
    }
}

function updateAIStatus(msg) {
    const el  = document.getElementById('neuro-status-text');
    const box = document.getElementById('neuro-ai-status');
    if (el) el.innerText = msg;
    if (msg === 'Done!' && box) box.style.display = 'none';
}

function renderAIMetadata(data) {
    const box = document.getElementById('neuro-ai-metadata');
    if (!box) return;
    if (data.error) {
        box.innerHTML = `<div style="text-align:center;color:#ff4b4b;padding:40px;background:rgba(255,75,75,0.1);border-radius:16px;border:1px solid rgba(255,75,75,0.3);"><h2>⚠️ Engine Connection Failed</h2><p>${data.error}</p></div>`;
        return;
    }
    const safe = (data.page_summary || '').replace(/"/g, '&quot;');
    box.innerHTML = `
        <div style="display:flex;gap:24px;align-items:center;margin-bottom:40px;animation:slideUp 0.7s cubic-bezier(0.16,1,0.3,1);">
            <div style="flex:1;background:rgba(255,255,255,0.025);backdrop-filter:blur(15px);padding:45px 50px;border-radius:32px;border:1px solid rgba(255,255,255,0.06);position:relative;box-shadow:0 20px 50px rgba(0,0,0,0.25);">
                <button class="neuro-tts-btn neuro-tts-tldr" data-text="${safe}" style="position:absolute;top:35px;right:35px;background:rgba(167,139,250,0.15);color:#a78bfa;border:none;padding:10px 22px;border-radius:30px;cursor:pointer;font-size:14px;font-weight:600;transition:0.3s;font-family:'Outfit',sans-serif;">🔊 Listen</button>
                <h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin-top:0;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:18px;margin-bottom:24px;">📝 Article Summary</h3>
                <p style="font-size:var(--neuro-font-size,20px);margin-bottom:0;color:#f8fafc;padding-right:120px;font-weight:300;line-height:var(--neuro-line-height,1.6);">${formatBionicText(data.page_summary)}</p>
            </div>
            <div style="flex:0 0 240px;background:linear-gradient(155deg,rgba(109,40,217,0.18),rgba(79,70,229,0.12));backdrop-filter:blur(15px);padding:30px 20px;border-radius:28px;border:1px solid rgba(167,139,250,0.15);box-shadow:0 20px 50px rgba(0,0,0,0.3);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
                <span style="font-weight:700;color:#c084fc;text-transform:uppercase;font-size:12px;letter-spacing:2px;opacity:0.9;">Detected Tone</span>
                <div style="font-size:26px;font-weight:600;margin-top:15px;color:#f8fafc;line-height:1.3;">${data.page_tone || 'Neutral'}</div>
            </div>
        </div>`;
}

function renderAIChunk(data) {
    const box = document.getElementById('neuro-ai-chunks');
    if (!box || data.error) return;

    let html = '';
    (data.simplified_chunks || []).forEach(chunk => {
        const emotion = (chunk.emotion || 'neutral').toLowerCase();
        const emo     = EMOTION_MAP[emotion] || EMOTION_MAP.neutral;
        const heading = chunk.heading       || 'Extracted Insight';
        const bullets = chunk.bullet_points || [];

        const bulletsHtml = bullets.map(bp =>
            `<li style="margin-bottom:15px;display:flex;gap:18px;"><span style="color:#c084fc;font-weight:bold;flex-shrink:0;font-family:sans-serif;margin-top:-2px;">→</span><span>${formatBionicText(bp)}</span></li>`
        ).join('');

        const prefix  = emo.adverb ? `${emo.adverb}, ` : '';
        const rawText = prefix + [heading, ...bullets].join(' ');
        const safe    = rawText.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        html += `
            <div style="margin-bottom:35px;animation:slideUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0;background:rgba(255,255,255,0.02);backdrop-filter:blur(15px);padding:45px 50px;border-radius:32px;border:1px solid ${emo.border};position:relative;transition:transform 0.4s,background 0.4s,box-shadow 0.4s;" onmouseover="this.style.background='rgba(255,255,255,0.035)';this.style.transform='translateY(-6px)';this.style.boxShadow='0 25px 60px rgba(0,0,0,0.4)';" onmouseout="this.style.background='rgba(255,255,255,0.02)';this.style.transform='translateY(0)';this.style.boxShadow='none';">
                <div style="display:inline-flex;align-items:center;gap:7px;background:${emo.bg};border:1px solid ${emo.border};color:${emo.color};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;"><span>${emo.emoji}</span><span>${emotion}</span></div>
                <button class="neuro-tts-btn" data-text="${safe}" style="position:absolute;top:40px;right:40px;background:rgba(255,255,255,0.06);color:#e2e8f0;border:none;padding:10px 22px;border-radius:30px;cursor:pointer;font-size:13px;font-weight:600;transition:0.3s;font-family:'Outfit',sans-serif;">🔊 Speak</button>
                <h4 style="color:#f8fafc;margin-top:0;margin-bottom:30px;font-size:calc(var(--neuro-font-size,21px) * 1.15);font-weight:600;padding-right:120px;letter-spacing:-0.5px;">${formatBionicText(heading)}</h4>
                <ul style="color:#cbd5e1;font-size:var(--neuro-font-size,21px);line-height:var(--neuro-line-height,1.8);margin:0;padding-left:15px;list-style-type:none;font-weight:300;">${bulletsHtml}</ul>
            </div>`;
    });
    box.innerHTML += html;
}

// Read Aloud Engine: Highlighting words as they are spoken
if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
        if (!e.target.classList.contains('neuro-tts-btn')) return;

        const text      = e.target.getAttribute('data-text');
        const isPlaying = e.target.innerText.includes('Stop');

        window.speechSynthesis.cancel();
        document.querySelectorAll('.neuro-tts-word').forEach(w => {
            w.style.backgroundColor = 'transparent'; w.style.color = ''; w.style.boxShadow = 'none';
        });
        document.querySelectorAll('.neuro-tts-btn').forEach(btn => {
            btn.innerText = btn.classList.contains('neuro-tts-tldr') ? '🔊 Listen' : '🔊 Speak';
        });

        if (isPlaying) return;

        e.target.innerText = '⏹ Stop';
        const utt      = new SpeechSynthesisUtterance(text);
        utt.rate       = 0.85;
        const words    = Array.from(e.target.parentElement.querySelectorAll('.neuro-tts-word'));
        const clearAll = () => words.forEach(w => { w.style.backgroundColor = 'transparent'; w.style.color = ''; w.style.boxShadow = 'none'; });

        utt.onboundary = ev => {
            if (ev.name !== 'word') return;
            clearAll();
            const idx = text.substring(0, ev.charIndex).split(' ').length - 1;
            if (words[idx]) { words[idx].style.backgroundColor = 'rgba(129,140,248,0.4)'; words[idx].style.color = '#ffffff'; words[idx].style.boxShadow = '0 0 8px rgba(129,140,248,0.3)'; }
        };
        utt.onend = () => {
            e.target.innerText = e.target.classList.contains('neuro-tts-tldr') ? '🔊 Listen' : '🔊 Speak';
            clearAll();
        };
        window.speechSynthesis.speak(utt);
    });
}

// Main Listener: Handles requests from the extension to scan or simplify the page
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
        if (req.action === 'extract_dom') {
            applyMediaControl();
            const domData = extractAndTagContent();
            initRightPanel();
            sendResponse(domData);
        } else if (req.action === 'update_status')       { updateAIStatus(req.message);
        } else if (req.action === 'render_ai_metadata')  { renderAIMetadata(req.data);
        } else if (req.action === 'render_ai_chunk')     { renderAIChunk(req.data);
        }
        return true;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  9. TEST EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
    module.exports = { applyMediaControl, extractAndTagContent, calculateCognitiveLoad };
}
