// background.js – Synapse Extension Service Worker (entry point)
// All heavy logic lives in src/background/groqClient.js
import { fetchFromGroq } from './src/background/groqClient.js';

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
        "Simplify this content for neurodivergent readers. Rules:\n" +
        "• Literal translations only — destroy all idioms and metaphors.\n" +
        "• Create one short descriptive 'heading' per paragraph.\n" +
        "• Summarize as 'bullet_points' — 2 to 3 clear, factual, unique points per chunk.\n" +
        "• Each bullet MUST contain a DIFFERENT piece of information. Never repeat the same fact twice.\n" +
        "• The FIRST bullet point must NOT repeat the heading verbatim.\n" +
        "• Detect the emotional tone of each paragraph and return it as 'emotion'.\n" +
        "  emotion must be ONE of: neutral | sarcastic | angry | excited | fearful | sad | urgent | humorous | critical\n" +
        "  This is critical for Autistic readers who cannot detect emotional tone from text alone.\n" +
        "• Skip any paragraph that looks like an Ad, 'More News', promo, or UI chrome or off the context of the page.\n" +
        "• Treat each distinct story or paragraph as its own 'simplified_chunk'.\n" +
        "• Do NOT merge different article headlines into one summary.\n" +
        "Return ONLY raw JSON: {\"simplified_chunks\": [{\"id\": \"...\", \"heading\": \"...\", \"emotion\": \"...\", \"bullet_points\": [...]}]}\n\n" +
        "Input: " + JSON.stringify(chunkBatch)
    );
}

// Pipeline: The main logic that runs when you click the extension icon

chrome.action.onClicked.addListener(async (tab) => {
    try {
        // 1. Get the content from the page
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract_dom" });
        if (!response?.contentMap?.length) {
            console.warn("Synapse: No content extracted from page.");
            return;
        }
        const allContent = response.contentMap;

        // 2. Generate quick metadata (overall tone and absolute summary)
        chrome.tabs.sendMessage(tab.id, {
            action: "update_status",
            message: "Analyzing page context with Groq AI…"
        });

        const metaData = await fetchFromGroq(buildMetaPrompt(allContent.slice(0, 40)));
        chrome.tabs.sendMessage(tab.id, { action: "render_ai_metadata", data: metaData });

        // 3. Process the rest of the text in small chunks
        chrome.tabs.sendMessage(tab.id, {
            action: "update_status",
            message: "Translating blocks via Groq LPU Network…"
        });

        // CHUNK_SIZE = 3 (Safe for 6k TPM limits)
        const CHUNK_SIZE = 3;
        for (let i = 0; i < allContent.length; i += CHUNK_SIZE) {
            const batch     = allContent.slice(i, i + CHUNK_SIZE);
            const chunkData = await fetchFromGroq(buildChunkPrompt(batch));

            chrome.tabs.sendMessage(tab.id, { action: "render_ai_chunk", data: chunkData });

            // 2.1s between requests = safely within Groq 30 RPM free limit
            if (i + CHUNK_SIZE < allContent.length) {
                await new Promise(r => setTimeout(r, 2100));
            }
        }

        chrome.tabs.sendMessage(tab.id, { action: "update_status", message: "Done!" });

    } catch (err) {
        console.error("Synapse pipeline error:", err);
    }
});
