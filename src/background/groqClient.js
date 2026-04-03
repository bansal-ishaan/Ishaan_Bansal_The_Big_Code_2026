// groqClient.js: Connects to the Groq API to simplify text.
// This handles model selection, JSON formatting, and error handling.

import { GROQ_API_KEY } from '../../config.js';

const GROQ_BASE = "https://api.groq.com/openai/v1";

// We try to use the best model available on your API key
const MODEL_PRIORITY = [
    "llama3-8b-8192",          // Fast and has great free-tier limits
    "mixtral-8x7b-32768",      // Good fallback with a large context
    "llama-3.3-70b-versatile", // Very smart, but hits limits quickly
    "llama-3.1-8b-instant",    // Basic fallback
];

let _cachedModel = null; // Cache model per session to avoid repeated list calls

async function resolveModel() {
    if (_cachedModel) return _cachedModel;

    try {
        const res  = await fetch(`${GROQ_BASE}/models`, {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
        });
        const data = await res.json();

        if (data.data) {
            const available = data.data.map(m => m.id);

            for (const preferred of MODEL_PRIORITY) {
                if (available.includes(preferred)) {
                    _cachedModel = preferred;
                    return _cachedModel;
                }
            }

            // Final fallback: pick any non-audio, non-vision model
            const valid = available.filter(m => !m.includes("whisper") && !m.includes("vision"));
            if (valid.length > 0) {
                _cachedModel = valid[valid.length - 1];
                return _cachedModel;
            }
        }
    } catch (e) {
        console.warn("Synapse: Model auto-discovery failed, using default.", e);
    }

    _cachedModel = MODEL_PRIORITY[0];
    return _cachedModel;
}

// Sends the prompt to Groq and cleans up the resulting JSON
export async function fetchFromGroq(promptText) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "PUT_YOUR_GROQ_API_KEY_HERE") {
        return { error: "Please open config.js and paste your Groq API Key!" };
    }

    const model = await resolveModel();

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
        response_format: { type: "json_object" }, // Native JSON mode – prevents markdown wrapping
        temperature: 0.1,
    };

    try {
        const res  = await fetch(`${GROQ_BASE}/chat/completions`, {
            method:  "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:  `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.error) return { error: `Groq API Error: ${data.error.message}` };

        // Strip any stray markdown fences just in case
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
