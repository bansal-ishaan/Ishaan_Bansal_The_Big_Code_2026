# ✨ Synapse — The Neuro-Inclusive Digital Sanctuary

> **Restructuring the internet for cognitively diverse minds.** A high-performance Chrome extension designed to eliminate sensory overload and cognitive barriers for ADHD, Autism, and Dyslexic users.

---

## 🧠 The Vision: Beyond "Accessibility"
Universal Design shouldn't just be about vision or hearing. The modern web is optimized for **"Economic Attention"**—using flashes, noise, and complex jargon to keep users engaged. For neurodivergent brains, this is a **hostile digital environment**.

**Synapse** isn't a "Reader Mode"; it's a **Cognitive Safeguard**. It rebuilds the internet’s content using a design system built for focus, emotional clarity, and ergonomic reading.

---

## ⚡ Core Features & "Brain Hacks"

### 1. The Zen Reader (Articles Mode)
When activated on a text-heavy page, Synapse injects a high-performance overlay that extracts the "essence" of the content.
- **Groq-LPU Simplification**: Re-encodes complex text into "Plain English" bullet points at sub-100ms latency.
- **Bionic Reading Patterns**: Mathematically-calculated fixation points (bolding the starts of words) to guide the ADHD eye across lines without skipping.
- **Emotion Mapping (Tone Tagging)**: ASD-friendly labels that clarify social signals (e.g., tagging a paragraph as *Sarcastic*, *Literal*, or *Urgent*).
- **Cognitive Scorer**: An upfront "Complexity Meter" (1-100) that predicts how much "focus-fuel" the user will need to finish the article.

### 2. Physical Reading Controls
- **OpenDyslexic Support**: A typeface specifically designed to prevent "letter-flipping" and visual crowding.
- **Dynamic Line Spacing**: Adjustable `line-height` variables to suit individual visual processing speeds.
- **Speech Synthesis (Karaoke-Style)**: Real-time word-by-word highlighting synced with high-quality TTS to keep the user "on track."

### 3. YouTube Focus Guardians
YouTube is a primary learning tool but a secondary distraction engine. Synapse cleanses it:
- **Inline Comment Toggle**: Repositioned between the Channel metadata and Action row for "On-Demand" social interaction.
- **HUD Removal**: Strips away the "Subscriptions" sidebar and recommended shelves to prevent endless scrolling loops (ADHD "Hyperfocus" guard).
- **Shorts Guard**: Permanently eliminates the "Shorts" shelf from the homepage and search results.

---

## 🏗️ Technical Architecture: The "Modular-First" Design
Synapse is built on a high-speed **Manifest V3** stack designed for zero-overhead.

### Communication Flow:
1. **DOM Extractor**: Operates in the `content.js` sandbox to scrape the main semantic tree while filtering out 98% of "noise" (Ads, Sidebars, Modals).
2. **MCP Broker**: The **Model Context Protocol** serves as a standardized transport layer, packaging the extracted DOM and user preferences for the AI.
3. **Groq Inference Engine**: Handled via the Background Service Worker to avoid blocking the UI thread.
4. **Reactive Renderer**: Injects the cleaned data into a glassmorphic overlay using Vanilla CSS Variables (no heavy frameworks).

```
synapse/
├── background.js          # Service Worker: Handles MCP requests & AI Client
├── content.js             # UI Shell: Injects the overlay & handles "The Scan"
├── manifest.json          # MV3 Configuration
└── src/
    ├── youtube/           # YouTube-specific cognitive guards (CommentShield, HUD)
    ├── content/           # Core extraction (domExtractor.js) & UI (renderer.js)
    └── utils/             # Algorithms: Bionic Reading & Cognitive Scorer
```

---

## 🚀 Professional Setup Guide

### prerequisites
- A Chromium-based browser (Chrome 88+, Brave, Edge).
- A **Groq Cloud API Key** ([Get it for free here](https://console.groq.com)).

### Installation
1. **Clone & Extract**:
   ```bash
   git clone https://github.com/bansal-ishaan/synapse.git
   ```
2. **API Configuration**:
   Open `config.js` and input your key:
   ```javascript
   export const GROQ_API_KEY = "your_key_here";
   ```
3. **Developer Load**:
   - Go to `chrome://extensions`.
   - Enable **Developer Mode**.
   - Click **Load unpacked** and select the repository folder.

---

## 📊 Synapse vs. Standard Reader Modes

| Feature | Reader Mode | Synapse |
|---|---|---|
| **Layout Cleaning** | ✅ | ✅ |
| **Language Simplification** | ❌ | ✅ (AI-Powered) |
| **Tone Detection** | ❌ | ✅ (For Autism Support) |
| **Bionic Reading** | ❌ | ✅ (For ADHD Focus) |
| **Sensory Dimming** | ❌ | ✅ (Image/Video Blur) |
| **latency** | High | Ultra-Low (Groq LPU) |

---

## 🛡️ Privacy, Ethics & Security
Synapse was built with a **"Security-by-Design"** philosophy:
- **Zero-Storage Persistence**: We don't keep logs of what you read. All data is processed in-memory during a session and destroyed upon tab closure.
- **On-Device Filtering**: Content discovery and DOM cleaning happen entirely in the client sandbox. Only the "Clean Text" is sent to the AI.
- **Bias Mitigation**: Our prompts are engineered to avoid political or social bias, focusing strictly on *Linguistic Simplification*.


---

## 📄 License & Contact
- **License**: MIT
- **Creator**: Ishaan Bansal ([ishaanbansal1412@gmail.com](mailto:ishaanbansal1412@gmail.com))
- **Hackathon**: Submission for Big Code 2026.

---
*Built with heart for the neurodivergent community.* 🧠✨
