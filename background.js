// background.js – Synapse Extension Service Worker (entry point)
// All heavy logic lives in src/background/groqClient.js
import { fetchFromGroq, fetchVisionFromGroq } from './src/background/groqClient.js';

// Prompt Generation: Setting the rules for how the AI simplifies the text

function buildMetaPrompt(contentSlice) {
    return (
        "Analyze the MAIN article in this content and return ONLY raw JSON.\n" +
        "Format: {\"page_tone\": \"[single descriptive word]\", \"page_summary\": \"3-sentence plain-English summary\"}\n" +
        "CRITICAL: Ignore advertisements, 'web stories', 'more news', or any UI elements.\n\n" +
        JSON.stringify(contentSlice)
    );
}

function buildChunkPrompt(chunkBatch) {
    return (
        "You are a specialized accessibility engine. Your goal is to simplify news for neurodivergent readers (ADHD, Autism).\n\n" +
        "Rules for SUPREME QUALITY Output:\n" +
        "• CRITICAL: If an input item is a section label, nav item, or has no real news content (e.g. 'Breaking News', 'Notifications', 'Reader's Digest', 'More Stories'), SKIP IT entirely — do not create a chunk for it.\n" +
        "• Only process items that contain actual factual news information — real events, people, places, numbers.\n" +
        "• Use clear, factual, adult language. Never use childish tones.\n" +
        "• LITERALLY translate all metaphors, idioms, and figure of speech.\n" +
        "• For each real paragraph, create a 'heading' that captures the specific event or development.\n" +
        "• Summarize as 'bullet_points'. Each bullet MUST contain ONE distinct new fact. Never repeat information.\n" +
        "• Tone Tagging: Pick ONE (neutral|sarcastic|angry|excited|fearful|sad|urgent|humorous|critical).\n" +
        "• Multilingual Support: If the input is Hindi (Devanagari), output in cleaned Hindi. If English, output English.\n" +
        "• Output ONLY JSON: {\"simplified_chunks\": [{\"id\": \"...\", \"heading\": \"...\", \"emotion\": \"...\", \"bullet_points\": [...]}]}\n\n" +
        "Input: " + JSON.stringify(chunkBatch)
    );
}

// Pipeline: The main logic that runs when triggered from the popup

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_article_analysis") {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) return;

        (async () => {
            try {
                // 1. Get the content from the page
                const response = await chrome.tabs.sendMessage(tabId, { action: "extract_dom" });
                if (!response?.contentMap?.length) {
                    console.warn("Synapse: No content extracted from page.");
                    return;
                }
                const allContent = response.contentMap;

                // 2. Generate quick metadata (overall tone and absolute summary)
                chrome.tabs.sendMessage(tabId, {
                    action: "update_status",
                    message: "Analyzing page context with Groq AI…"
                });

                const metaData = await fetchFromGroq(buildMetaPrompt(allContent.slice(0, 40)));
                chrome.tabs.sendMessage(tabId, { action: "render_ai_metadata", data: metaData });

                // 3. Process the rest of the text in small chunks
                chrome.tabs.sendMessage(tabId, {
                    action: "update_status",
                    message: "Translating blocks via Groq LPU Network…"
                });

                // Process with a 3.5s 'Thinking Time' delay for better quality inference
                const CHUNK_SIZE = 2;
                for (let i = 0; i < allContent.length; i += CHUNK_SIZE) {
                    const batch     = allContent.slice(i, i + CHUNK_SIZE);
                    const chunkData = await fetchFromGroq(buildChunkPrompt(batch));

                    chrome.tabs.sendMessage(tabId, { action: "render_ai_chunk", data: chunkData });

                    if (i + CHUNK_SIZE < allContent.length) {
                        await new Promise(r => setTimeout(r, 3500));
                    }
                }

                chrome.tabs.sendMessage(tabId, { action: "update_status", message: "Done!" });

            } catch (err) {
                console.error("Synapse pipeline error:", err);
            }
        })();
        return true;
    }
});


// ── YOUTUBE FEATURES ───────────────────────────────────────────────────────

// Score YouTube recommendations
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'score_recommendations') {
        try {
            const prompt = `Current video: "${request.currentTitle}"\nRecommendations: ${JSON.stringify(request.recTitles)}\n\nFor each recommendation, return: { "title": "...", "relevanceScore": 0-100, "tag": "relevant|unrelated|emotionally-draining|clickbait" }\nOnly return raw JSON array.`;
            const result = await fetchFromGroq(prompt);
            sendResponse({ scores: result });
        } catch (err) {
            sendResponse({ error: err.message });
        }
        return true;
    }

    // Generate key points from description/metadata
    if (request.action === 'generate_key_points') {
        try {
            const prompt = `Based on this YouTube video description, generate 3-5 expected key points or themes that this video will cover. Return JSON: [{"time": "0:00", "title": "key point summary"}]\n\nVideo Description: ${request.description}`;
            const result = await fetchFromGroq(prompt);
            sendResponse({ keyPoints: result });
        } catch (err) {
            sendResponse({ error: err.message });
        }
        return true;
    }

    // Summarize comments
    if (request.action === 'summarize_comments') {
        try {
            const prompt = `Here are the top YouTube comments for a video titled "${request.videoTitle}":\n${JSON.stringify(request.comments)}\n\nSummarize what people are saying in 3 clear, factual bullet points.\nAvoid negativity. Focus on what information or reactions are common.\nReturn ONLY JSON: { "summary": ["...", "...", "..."] }`;
            const result = await fetchFromGroq(prompt);
            sendResponse(result);
        } catch (err) {
            sendResponse({ error: err.message });
        }
        return true;
    }

    // Set Shorts reminder
    if (request.action === 'set_shorts_reminder') {
        chrome.alarms.create('synapse-shorts-reminder', { delayInMinutes: request.minutes });
        sendResponse({ success: true });
        return true;
    }
});

// Handle Shorts reminder alarm
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'synapse-shorts-reminder') {
        // Inject reminder banner (simplified - would need to message content script)
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, tabs => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'show_shorts_reminder' });
            });
        });
    }
});

// =========================
// Synapse Lens — Element-level Visual Analyzer
// =========================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== 'analyze_element') return;

    const tabId = sender.tab?.id;
    if (!tabId) return;

    (async () => {
        try {
            const { rect, dpr = 1, language = 'English' } = request;

            // ─ Step 1: Capture IMMEDIATELY (before content script shows any overlay)
            const fullDataUrl = await new Promise((resolve, reject) => {
                chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 90 }, (dataUrl) => {
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else if (!dataUrl) reject(new Error('captureVisibleTab returned empty'));
                    else resolve(dataUrl);
                });
            });

            // ─ Step 2: Signal content script to show the loading overlay NOW (safe — screenshot is done)
            chrome.tabs.sendMessage(tabId, { action: 'vision_captured' });

            // ─ Step 3: Crop to the user's selection using OffscreenCanvas
            const res    = await fetch(fullDataUrl);
            const blob   = await res.blob();
            const bitmap = await createImageBitmap(blob);

            const sx = Math.round(rect.x * dpr);
            const sy = Math.round(rect.y * dpr);
            const sw = Math.round(rect.w * dpr);
            const sh = Math.round(rect.h * dpr);

            const canvas = new OffscreenCanvas(sw, sh);
            const ctx    = canvas.getContext('2d');
            ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

            // Safe base64 conversion that avoids stack-overflow on large arrays
            const croppedBlob   = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
            const croppedBuffer = await croppedBlob.arrayBuffer();
            const bytes         = new Uint8Array(croppedBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const croppedBase64  = btoa(binary);
            const croppedDataUrl = `data:image/jpeg;base64,${croppedBase64}`;

            console.log(`[Synapse Lens] Cropped: ${sw}x${sh}px, ${Math.round(croppedBase64.length / 1024)}KB`);

            // ─ Step 4: Send to Groq Vision
            const result = await fetchVisionFromGroq(croppedDataUrl, language);

            // ─ Step 5: Push result back to tab
            chrome.tabs.sendMessage(tabId, {
                action:      'vision_analysis_result',
                description: result.description || null,
                error:       result.error       || null,
                imageUrl:    croppedDataUrl,
            });

        } catch (err) {
            console.error('[Synapse Lens] Error:', err.message);
            chrome.tabs.sendMessage(tabId, { action: 'vision_analysis_result', error: err.message });
        }
    })();
});
