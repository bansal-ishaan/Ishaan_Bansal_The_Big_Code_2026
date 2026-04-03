// Content Scraper: This logic finds the actual article on the page.
// It looks for main landmarks like <article> or <main> and pulls the text,
// while being smart enough to skip sidebars, ads, and navigation menus.
// It also tags code blocks so our Bionic Reading doesn't mess up the syntax.

export function extractAndTagContent() {
    // ── 1. FIND MAIN CONTAINER ──────────────────────────────────────────────
    // Priority: ARIA main → known CMS selectors → semantic HTML → body fallback
    const mainContainer =
        document.querySelector('[role="main"]')         ||
        document.querySelector('#mw-content-text')      ||   // Wikipedia
        document.querySelector('.mw-parser-output')     ||   // Wikipedia mobile
        document.querySelector('.markdown-body')        ||   // GitHub README root
        document.querySelector('#readme .Box-body')     ||   // GitHub README wrapper
        document.querySelector('article')               ||
        document.querySelector('main')                  ||
        document.body;

    // ── 2. ELEMENT WHITELIST ─────────────────────────────────────────────────
    // Covers: headings, paragraphs, lists, description lists, figures, code,
    //         details/summary, and platform-specific callouts.
    const SELECTOR = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'img', 'picture',
        'li', 'blockquote',
        'dl', 'dt', 'dd',
        'figure', 'figcaption',
        'details', 'summary',
        'pre', 'code',
        '.p-note',                          // GitHub profile bio
        '[data-testid="user-profile-bio"]', // GitHub bio (new layout)
        '.markdown-body p',
        '.markdown-body li',
        '.theme-admonition',                // Docusaurus callouts
        '.alert',                           // Generic + GitBook callouts
    ].join(', ');

    const elements = mainContainer.querySelectorAll(SELECTOR);

    // ── 3. NOISE PATTERN REGISTRY ────────────────────────────────────────────
    const JUNK_PATTERN = /(ad-|ads-|advertisement|promo|related|story|sidebar|footer|-ad-|social-share|newsletter-signup|cookie-banner|related-posts)/;

    // ARIA roles that must always be excluded from the reading payload
    const EXCLUDED_ARIA = [
        '[role="navigation"]',
        '[role="banner"]',
        '[role="complementary"]',
        '[role="contentinfo"]',
        '[role="search"]',
    ];

    // ── 4. EXTRACT LOOP ──────────────────────────────────────────────────────
    const extractedData = [];
    let counter = 0;
    const MAX_CHUNKS = 40;

    for (const el of elements) {
        if (extractedData.length >= MAX_CHUNKS) break;

        // 4a. Class/ID junk filter
        const combinedAttr = `${el.className} ${el.id}`.toLowerCase();
        if (JUNK_PATTERN.test(combinedAttr)) continue;

        // 4b. Semantic landmark exclusion
        const skipAria = EXCLUDED_ARIA.some(sel => el.closest(sel));
        if (skipAria) continue;

        // 4c. Structural landmark exclusion
        if (
            el.closest('aside')   ||
            el.closest('nav')     ||
            el.closest('footer')  ||
            el.closest('header')  ||
            el.closest('.sidebar')
        ) continue;

        // 4d. Hidden element exclusion
        if (window.getComputedStyle?.(el)?.display === 'none') continue;

        // ── 5. NODE TYPE HANDLING ────────────────────────────────────────────
        const isCodeNode   = el.tagName === 'CODE' || el.tagName === 'PRE';
        const isMediaNode  = el.tagName === 'IMG'  || el.tagName === 'PICTURE';
        const isGithubZone = el.closest('.markdown-body') !== null;

        let textContent = "";
        let imgSrc      = null;

        if (isMediaNode) {
            imgSrc = el.src || '';

            // GitHub stat cards and SVG badges must bypass all media filtering
            if (!isGithubZone) {
                if (/ad|server|banner|logo|tracker|pixel|icon|button/i.test(imgSrc)) continue;
                if (imgSrc.length < 10) continue;
            }

            textContent = el.alt || 'Media Component';
            if (!isGithubZone && textContent.length < 5) continue;

        } else {
            textContent = (el.innerText || el.textContent || '').trim();
            // Code/callout blocks can be short; skip tiny junk for everything else
            if (!isCodeNode && textContent.length <= 20) continue;
        }

        // ── 6. TAG & PUSH ────────────────────────────────────────────────────
        const elemId = `neuro-id-${counter++}`;
        el.setAttribute('data-neuro-id', elemId);

        // Protection flag stops Bionic Reading from decimating code syntax
        if (isCodeNode) el.setAttribute('data-neuro-protect', 'true');

        extractedData.push({
            id:      elemId,
            tag:     el.tagName,
            text:    textContent,
            src:     imgSrc,
            protect: isCodeNode,
        });
    }

    return extractedData;
}
