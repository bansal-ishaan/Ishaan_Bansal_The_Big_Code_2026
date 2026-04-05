// groqClient.js: Connects to the Groq API to simplify text.
// This handles model selection, JSON formatting, and error handling.

import { GROQ_API_KEY } from '../../config.js';

const GROQ_BASE = "https://api.groq.com/openai/v1";

// Model fallback chain — ordered from highest free-tier TPD to lowest
const MODEL_PRIORITY = [
    "llama-3.1-8b-instant",    // Replacement for llama3-8b-8192
    "mixtral-8x7b-32768",      // High reliability
    "gemma2-9b-it",            // Separate TPD pool
    "llama-3.3-70b-versatile", // Very smart, but hits limits quickly
];

let _triedModels = new Set(); // Track which models we've already exhausted

// Returns the next available model that hasn't been tried yet
function getNextModel() {
    for (const m of MODEL_PRIORITY) {
        if (!_triedModels.has(m)) return m;
    }
    return null; // All exhausted
}

// Sends the prompt to Groq and auto-falls-back on rate limits
export async function fetchFromGroq(promptText) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "PUT_YOUR_GROQ_API_KEY_HERE") {
        return { error: "Please open config.js and paste your Groq API Key!" };
    }

    const model = getNextModel();
    if (!model) {
        _triedModels.clear(); // Reset for next call
        return { error: "All available models have hit their daily token limits. Please wait 1 hour and try again, or upgrade your Groq account at https://console.groq.com/settings/billing" };
    }

    console.log(`Synapse: Using model → ${model}`);

    const payload = {
        model,
        messages: [
            {
                role: "system",
                content:
                    "You are a rigidly constrained extraction system. " +
                    "Output ONLY raw, un-formatted, valid JSON — no markdown, no explanation, no extra fields.",
            },
            { role: "user", content: promptText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
    };

    try {
        const res = await fetch(`${GROQ_BASE}/chat/completions`, {
            method:  "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:  `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        // HTTP 429 — model is rate-limited, try the next one
        if (res.status === 429) {
            console.warn(`Synapse: ${model} hit HTTP 429 rate limit. Trying next model...`);
            _triedModels.add(model);
            return fetchFromGroq(promptText);
        }

        const data = await res.json();

        // Groq sometimes returns 200 OK but with a rate_limit error in the body
        if (data.error) {
            const msg = data.error.message || '';
            const isRateLimit = msg.includes('rate_limit') || msg.includes('Rate limit') || msg.includes('tokens per day') || msg.includes('TPD');
            if (isRateLimit) {
                console.warn(`Synapse: ${model} hit body-level rate limit. Trying next model...`);
                _triedModels.add(model);
                return fetchFromGroq(promptText);
            }
            return { error: `Groq API Error: ${msg}` };
        }

        // Success — reset tried list so future calls start fresh
        _triedModels.clear();

        let raw = data.choices[0].message.content.trim()
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        return JSON.parse(raw);

    } catch (err) {
        console.error("Synapse groqClient error:", err);
        return { error: "Groq parsing error: " + err.message };
    }
}

// Sends an image to Groq's Vision model
export async function fetchVisionFromGroq(base64Image, languagePrompt) {
    const timestamp = new Date().toISOString();
    
    if (!GROQ_API_KEY || GROQ_API_KEY === "PUT_YOUR_GROQ_API_KEY_HERE") {
        console.error(`[${timestamp}] Vision API Key missing or not configured`);
        return { error: "Please open config.js and paste your Groq API Key!" };
    }

    // Groq's current vision model (as of April 2026) — Llama 4 Scout
    // Base64 image limit: 4MB. Cropped element approach keeps us well under this.
    const model = "meta-llama/llama-4-scout-17b-16e-instruct";
    console.log(`[${timestamp}] Synapse Vision: Using model → ${model}`);
    console.log(`[${timestamp}] Synapse Vision: Language → ${languagePrompt}`);
    console.log(`[${timestamp}] Synapse Vision: Image size → ${Math.round(base64Image.length / 1024)}KB`);

    // Guard: base64 images must be under 4MB per Groq's limit
    if (base64Image.length > 4 * 1024 * 1024) {
        console.error(`[${timestamp}] Synapse Vision: Image too large (${Math.round(base64Image.length / 1024)}KB > 4096KB)`);
        return { error: 'The selected area is too large to send to the API. Please select a smaller region.' };
    }

    const payload = {
        model,
        max_completion_tokens: 1024,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: `You are an accessibility assistant helping neurodivergent users understand visual content.
Analyze the diagram, chart, graph, or figure in this image.
Respond in ${languagePrompt} using ONLY the following structured format (no intro sentence, no markdown, no JSON):

OVERVIEW: (one sentence: what type of visual this is and what it shows)

KEY ELEMENTS:
- (bullet: describe each main label, value, axis, or node)
- (repeat for each key element)

WHAT IT MEANS:
- (bullet: plain-language interpretation of the main insight)
- (bullet: any notable trend, comparison, or relationship)

If there is no diagram or figure, just reply: No meaningful visual content detected.` },
                    { type: "image_url", image_url: { url: base64Image } }
                ]
            }
        ],
        temperature: 0.2,
    };

    try {
        console.log(`[${timestamp}] Synapse Vision: Sending request to Groq API...`);
        const requestStart = Date.now();
        
        const res = await fetch(`${GROQ_BASE}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const requestTime = Date.now() - requestStart;
        console.log(`[${timestamp}] Synapse Vision: API responded in ${requestTime}ms with status ${res.status}`);

        if (!res.ok && res.status !== 400 && res.status !== 429) {
            const text = await res.text();
            console.error(`[${timestamp}] Synapse Vision: Server error - ${res.status}`, text);
            return { error: `Groq server error (${res.status}): It might be overloaded. Please try again.` };
        }

        let data;
        try {
            data = await res.json();
            console.log(`[${timestamp}] Synapse Vision: Response parsed successfully`);
        } catch(e) {
            console.error(`[${timestamp}] Synapse Vision: Failed to parse JSON response:`, e);
            return { error: "Groq returned an invalid response. It is likely overloaded. Try again." };
        }

        if (data.error) {
            console.error(`[${timestamp}] Synapse Vision: API returned error:`, data.error);
            return { error: `Groq API Error: ${data.error.message}` };
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error(`[${timestamp}] Synapse Vision: Unexpected response structure:`, data);
            return { error: "Groq returned unexpected response format." };
        }

        const description = data.choices[0].message.content.trim();
        console.log(`[${timestamp}] Synapse Vision: Analysis complete - ${description.length} characters`);
        
        return { description };
    } catch (err) {
        console.error(`[${timestamp}] Synapse Vision: Network/parsing error:`, err);
        return { error: "Groq Vision parsing error: " + err.message };
    }
}
