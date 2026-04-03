// content.js

// -- 1. SENSORY & MEDIA CONTROLS --
function applyMediaControl() {
    console.log("Neuro-Extension: Applying Absolute Media Control...");
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

// -- 2. COGNITIVE SCORER MODULE --
function calculateCognitiveLoad(contentMap) {
    if (contentMap.length === 0) {
        return { overallLoad: 0, readingGrade: 0, clutterMetric: 0, message: "No text data extracted." };
    }
    
    // Only calculate text for the reading grade, ignore image chunks
    let totalText = contentMap.filter(t => t.tag !== 'IMG').map(t => t.text).join(' ');
    
    let sentences = totalText.split(/[.!?]+/).filter(Boolean).length || 1;
    let words = totalText.split(/\s+/).filter(Boolean).length || 1;
    
    let syllables = 0;
    totalText.split(/\s+/).forEach(w => {
        const matches = w.match(/[aeiouy]{1,2}/gi);
        let count = matches ? matches.length : 1;
        if (w.endsWith('e')) count--;
        syllables += Math.max(count, 1);
    });

    let readingGrade = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
    readingGrade = Math.max(0, Math.min(Math.round(readingGrade * 10) / 10, 20)); 
    
    const linksOnPage = document.querySelectorAll('a').length;
    let loadScore = (readingGrade * 4.5) + (linksOnPage * 0.05);

    return {
        overallLoad: Math.round(Math.min(loadScore, 100)),
        readingGrade: readingGrade,
        clutterMetric: linksOnPage,
        message: loadScore > 65 ? "High Cognitive Load. Simplification highly recommended." : "Manageable Load."
    };
}

// -- 3. SMART EXTRACTOR (NOW INCLUDES IMAGES) --
function extractAndTagContent() {
    let mainContainer = document.querySelector('#mw-content-text') || 
                        document.querySelector('.mw-parser-output') ||
                        document.querySelector('article') || 
                        document.querySelector('main') || 
                        document.body;

    // Added 'img' to our target lists!
    const textSelectors = 'p, h1, h2, h3, h4, img';
    const elements = mainContainer.querySelectorAll(textSelectors);
    
    let extractedData = [];
    let counter = 0;
    const MAX_CHUNKS = 40; 

    for(let el of elements) {
        if (extractedData.length >= MAX_CHUNKS) break;
        
        if (typeof window !== 'undefined' && window.getComputedStyle) {
            if (window.getComputedStyle(el).display === 'none') continue;
        }

        let textContent = "";
        let imgSrc = null;

        // NEW: Handle Images differently than text
        if (el.tagName === 'IMG') {
            // Ignore tiny decorative icons (like menu arrows)
            if (el.clientWidth > 0 && el.clientWidth < 50) continue; 
            
            imgSrc = el.src;
            textContent = el.alt || 'No alternative text provided.';
        } else {
            textContent = (el.innerText || el.textContent || '').trim();
            if (textContent.length <= 20) continue; // Ignore tiny text chunks
        }
        
        const elemId = `neuro-id-${counter++}`;
        el.setAttribute('data-neuro-id', elemId);
        
        extractedData.push({
            id: elemId,
            tag: el.tagName,
            text: textContent,
            src: imgSrc // Will be null for text, filled for images
        });
    }

    const scorer = calculateCognitiveLoad(extractedData);
    
    // Inject the frontend UI right when extraction is finished!
    injectZenSplitScreen(extractedData, scorer);

    return {
        title: document.title,
        url: window.location.href,
        cognitiveScore: scorer, 
        contentMap: extractedData 
    };
}

// -- 4. ZEN MODE SPLIT-SCREEN FRONTEND UI --
function injectZenSplitScreen(extractedData, scorer) {
    if (document.getElementById('neuro-zen-overlay')) return; // Prevent duplication if clicked twice

    const overlay = document.createElement('div');
    overlay.id = 'neuro-zen-overlay';
    
    // Use vanilla JS and CSS to create a full-page overlay that hides the distracting website
    overlay.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:#121212; color:#e0e0e0; z-index:2147483647; display:flex; flex-direction:column; font-family: 'Inter', system-ui, sans-serif; overflow:hidden;">
            
            <!-- Top Header -->
            <div style="padding: 20px 40px; background: #1e1e1e; border-bottom: 1px solid #333; display:flex; justify-content: space-between; align-items:center;">
                <h1 style="margin:0; font-size: 24px; color:#fff;">Neuro-Inclusive Reader</h1>
                <div style="display:flex; gap: 20px; align-items:center;">
                    <div style="background: ${scorer.overallLoad > 65 ? '#ef4444' : '#22c55e'}; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white;">
                        Load Score: ${scorer.overallLoad}/100
                    </div>
                    <button id="neuro-close-btn" style="background:#3b82f6; color:white; border:none; padding:10px 20px; cursor:pointer; border-radius:8px; font-weight:bold; font-size:14px;">Exit Zen Mode</button>
                </div>
            </div>
            
            <!-- Split Screen Logic -->
            <div style="display:flex; flex:1; overflow:hidden;">
                
                <!-- LEFT PANEL: Original Extracted Flow -->
                <div style="flex:1; padding: 40px; overflow-y:auto; border-right: 1px solid #333; background: #18181b;">
                    <h2 style="color:#a1a1aa; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin-bottom: 30px;">1. Original Clutter-Free Content</h2>
                    <div id="neuro-left-content" style="font-size: 18px; line-height: 1.7; max-width: 700px; margin: 0 auto; color: #d4d4d8;"></div>
                </div>
                
                <!-- RIGHT PANEL: AI Generation -->
                <div style="flex:1; padding: 40px; overflow-y:auto; background: #0f172a;">
                    <h2 style="color:#818cf8; font-size:12px; text-transform:uppercase; letter-spacing:2px; margin-bottom: 30px;">2. AI Simplified View</h2>
                    <div id="neuro-right-content" style="font-size: 21px; line-height: 2.0; max-width: 700px; margin: 0 auto; color: #e0e7ff;">
                        <div style="text-align: center; margin-top: 100px; opacity: 0.6;">
                            <h3 style="font-size:30px; margin-bottom:10px;">🤖</h3>
                            <i>Simulating Claude AI API...<br>Simplifying paragraphs and describing images...</i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Close button kills the UI
    document.getElementById('neuro-close-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // Populate Left Pane with the captured Arrays!
    const leftPane = document.getElementById('neuro-left-content');
    extractedData.forEach(item => {
        let el;
        if (item.tag === 'IMG') {
            // Show a visual block representing the image that was captured
            el = document.createElement('div');
            el.innerHTML = `🖼️ [Image Captured: ${item.src.substring(0, 40)}]`;
            el.style.cssText = "background: #27272a; padding: 10px; border-radius: 8px; font-size: 14px; color: #a1a1aa; font-style: italic; border: 1px dashed #52525b;";
        } else {
            el = document.createElement(item.tag);
            el.innerText = item.text;
        }
        el.style.marginBottom = '20px';
        leftPane.appendChild(el);
    });
}


// -- 5. LISTENERS --
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "extract_dom") {
            applyMediaControl();
            const domData = extractAndTagContent();
            sendResponse(domData);
        }
        return true; 
    });
}

// Export module for testing
if (typeof module !== 'undefined') {
    module.exports = {
        applyMediaControl,
        extractAndTagContent,
        calculateCognitiveLoad
    };
}
