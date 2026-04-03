# ✨ Synapse — Neuro-Inclusive Browser Extension

> A premium, AI-powered Chrome extension that transforms any webpage into a distraction-free, cognitively ergonomic reading environment.

---

## 🧠 What It Does

Synapse surgically dismantles the hostile architecture of the modern web and rebuilds it as a calm, accessible experience for users with **ADHD**, **Autism (ASD)**, and **Dyslexia**.

---

## ⚡ Feature Suite

| Feature | Benefit |
|---|---|
| **Groq AI Simplification** | One-click rewrite of any article into plain English bullet points |
| **Cognitive Load Scorer** | Flesch Grade + link-density analysis before AI even touches the page |
| **Karaoke-Style TTS** | Word-by-word highlighting synced to the browser's speech engine |
| **Bionic Reading Mode** | Bolds the first half of every word to create ADHD fixation points |
| **Dyslexic Font** | Instantly rewrites all text in OpenDyslexic / Comic Sans |
| **Sensory Dimming** | Blurs/grayscales all media and ads to prevent overload |
| **DOM Caching** | Closing the reader never triggers a second API call |
| **Floating Restore Badge** | One-click re-open with zero lag |
| **Onboarding Guide** | Explains every feature to new users |

---

## 📁 Project Structure

```
synapse/
├── background.js          # Service worker entry point
├── content.js             # Injected reader UI entry point
├── config.js              # ← PUT YOUR API KEY HERE
├── manifest.json          # Chrome Extension manifest (MV3)
│
└── src/
    ├── background/
    │   └── groqClient.js        # Groq API client (model discovery, JSON mode)
    ├── content/
    │   └── domExtractor.js      # Aggressive DOM extraction engine
    └── utils/
        ├── bionicText.js        # Bionic Reading pre-processor
        └── cognitiveScorer.js   # Flesch Reading Grade calculator
```

---

## 🚀 Setup

### 1. Get a free Groq API key
→ [console.groq.com](https://console.groq.com)

### 2. Add your key
Open `config.js` and replace the placeholder:
```js
export const GROQ_API_KEY = "gsk_your_actual_key_here";
```

### 3. Load the extension
1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `synapse/` folder

### 4. Use it
Navigate to any article or GitHub profile → click the **Synapse** icon in your toolbar.

---

## 🏗️ Tech Stack

- **Runtime**: Chrome Extension Manifest V3
- **AI Backend**: [Groq](https://groq.com) — `llama-3.1-8b-instant` on LPU hardware
- **Frontend**: Vanilla JS + CSS Glassmorphism (no frameworks)
- **Design**: Dark mode, `Outfit` font, neon-pastel palette, `backdrop-filter` glass

---

## 🧪 Tests

```bash
npm test
```

---

## 📄 License

MIT © Ishaan Bansal
