# ✨ Synapse — Neuro-Inclusive Browser Extension

> A calm, premium, and AI-powered Chrome extension that transforms any webpage into a distraction-free, cognitively ergonomic reading environment.

---

## 🧠 Why Synapse?

The modern web is built with **hostile architecture**: flashing ads, autoplaying videos, complex sentence structures, and a lack of emotional context. For users with **ADHD**, **Autism (ASD)**, or **Dyslexia**, this creates a high cognitive load that makes reading exhausting.

Synapse dismantles this clutter and rebuilds it using a design system inspired by **Notion** and **Kindle**—focused on deep focus and readability.

---

## ⚡ Key Features

| Feature | How it helps |
|---|---|
| **AI Simplification** | Rewrites complex articles into plain-English bullet points via **Groq AI**. |
| **Cognitive Load Scorer** | Shows you a complexity score (0-100) before you start reading. |
| **Bionic Reading** | Bolds the start of words to create "fixation points" that help the brain scan text faster. |
| **Karaoke-Style TTS** | Reads aloud with real-time word highlighting to keep you on track. |
| **Emotion Mapping** | Labels the emotional tone of paragraphs (Sarcastic, Urgent, Sad, etc.) to help with social processing. |
| **Sensory Dimming** | Automatically blurs distracting images and pauses videos until you hover over them. |
| **Accessibility Fonts** | One-click toggle for **OpenDyslexic** or **Comic Sans** to aid word recognition. |

---

## 🎨 Design Philosophy: "Zen Reader"

We moved away from neon glows and high-contrast gradients to create a truly "Zen" environment:
- **Calm Palette**: Soft dark background (`#0F1115`) with subtle glassmorphic surfaces.
- **Typography**: Clean, professional `Outfit` font with optimized line-height (1.8) and sizing (21px).
- **Interactive Micro-animations**: Smooth transitions that guide the eye without being distracting.

---

## 📁 Project Structure (Modular & Clean)

```
synapse/
├── background.js          # Main service worker pipeline
├── content.js             # Entry point for the reader UI (runtime bundle)
├── config.js              # ← Your Groq API Key goes here
├── manifest.json          # Chrome Extension Manifest (MV3)
│
└── src/                   # Readable, modular source code
    ├── background/
    │   └── groqClient.js  # Smart model discovery & API handling
    ├── content/
    │   ├── domExtractor.js # Intelligent article scraper & noise filter
    │   ├── mediaControl.js # Sensory dimming & distractions manager
    │   ├── renderer.js     # UI card generation & status updates
    │   ├── ttsEngine.js    # Karaoke-style highlighters
    │   └── zenReader.js    # The primary overlay & settings manager
    └── utils/
        ├── bionicText.js   # Bionic Reading engine
        └── cognitiveScorer.js # Page complexity algorithm
```

---

## 🚀 Getting Started

### 1. Get a Groq API Key
Head over to [console.groq.com](https://console.groq.com) and grab a free API key.

### 2. Configure the Extension
Open `config.js` and paste your key:
```javascript
export const GROQ_API_KEY = "your_key_here";
```

### 3. Load into Chrome
1. Go to `chrome://extensions`.
2. Turn on **Developer Mode**.
3. Click **Load unpacked** and select the folder.

---

## 🏗️ Technical Specs
- **AI Models**: Priority pool [ `llama3-8b-8192` → `mixtral-8x7b` ] for maximum speed and up to 30K TPM.
- **Backend**: Groq LPU Network for near-instant text simplification.
- **Frontend**: Vanilla Javascript & Clean CSS (Zero overhead, zero frameworks).

---

## 📄 License
MIT © Ishaan Bansal
