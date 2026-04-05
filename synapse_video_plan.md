# Synapse Video Mode — Implementation Plan
### Expanding Neuro-Inclusive Accessibility to YouTube

---

## Overview

This plan expands Synapse from a **news reader** into a **dual-mode accessibility engine** — one mode for articles, one for YouTube. The YouTube mode is entirely non-invasive: it injects a floating control panel over YouTube rather than replacing its UI, preserving the native experience while removing the elements that cause sensory overload.

> [!IMPORTANT]
> The YouTube module will live in a **completely separate content script** (`youtube.js`) injected only on `youtube.com`. This keeps the existing article reader untouched and independently testable.

---

## Architecture Decision

```
Synapse Extension
├── content.js          ← Article Reader (existing, unchanged)
├── youtube.js          ← YouTube Mode (NEW)
│   ├── audioGuard.js   ← Volume normalization engine
│   ├── recFilter.js    ← Recommendation context scorer
│   ├── focusMode.js    ← Chapter/summary overlay
│   ├── commentShield.js← Comment section manager
│   └── shortsGuard.js  ← Shorts pacing controller
├── background.js       ← Shared Groq AI pipeline (extended)
└── manifest.json       ← Add storage + youtube.com match
```

The background service worker already handles Groq API calls — we extend it to also serve **chapter summarization** and **recommendation context scoring** requests from `youtube.js`.

---

## Manifest Changes Required

```diff
{
  "permissions": [
    "activeTab",
    "scripting",
+   "storage",
+   "alarms"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
+   {
+     "matches": ["*://*.youtube.com/*"],
+     "js": ["youtube.js"],
+     "run_at": "document_idle"
+   }
  ]
}
```

- **`storage`** — needed to persist user preferences (volume target, Shorts timer, comment shield state)
- **`alarms`** — needed for the Shorts screen-time reminder

---

## Feature 1: Audio Guard (Loud/Sudden Audio Normalization)

### Problem
Ads and creators who whisper then scream cause sensory shock. The Web Audio API can monitor and limit volume in real-time.

### Implementation

**File:** `src/youtube/audioGuard.js`

```
YouTube Video <video> element
        ↓
AudioContext.createMediaElementSource()
        ↓
DynamicsCompressorNode   ← smooths sudden peaks
        ↓
GainNode (target: -14 LUFS)  ← normalizes to a calm level
        ↓
AudioContext.destination (speakers)
```

**Core logic:**
```javascript
// Attach to the video element once it appears in the DOM
function attachAudioGuard(videoEl) {
    const ctx        = new AudioContext();
    const source     = ctx.createMediaElementSource(videoEl);
    const compressor = ctx.createDynamicsCompressor();
    const gain       = ctx.createGain();

    compressor.threshold.value = -24;  // Start compressing at -24dB
    compressor.knee.value      = 30;
    compressor.ratio.value     = 12;   // Strong compression ratio
    compressor.attack.value    = 0.003;
    compressor.release.value   = 0.25;

    gain.gain.value = 0.85; // Slight overall reduction to create headroom

    source.connect(compressor);
    compressor.connect(gain);
    gain.connect(ctx.destination);
}
```

**User-facing control (in floating panel):**
- Toggle: "Audio Guard" ON/OFF
- Slider: "Max Volume" (50% – 100%)

> [!NOTE]
> The Web Audio API requires a user gesture to start the AudioContext. We trigger `ctx.resume()` on the first user click anywhere on the page.

---

## Feature 2: Recommendation Context Score

### Problem
The sidebar keeps pulling the user into unrelated or emotionally mismatched videos.

### Implementation

**File:** `src/youtube/recFilter.js`

**Workflow:**
```
1. Read current video title from DOM: document.querySelector('h1.ytd-video-primary-info-renderer')
2. Extract all recommendation titles:  document.querySelectorAll('ytd-compact-video-renderer h3')
3. Send BOTH to Groq (background.js) with this prompt:
   "Rate how relevant each recommendation is to the current video (0–100).
    Also tag each as: relevant | unrelated | emotionally-draining | clickbait"
4. Groq returns JSON: [{ title, score, tag }]
5. Apply CSS to hide/dim anything scored < threshold
```

**Groq prompt template:**
```
Current video: "${currentTitle}"
Recommendations: ${JSON.stringify(recTitles)}

For each, return: { "title": "...", "relevanceScore": 0-100, "tag": "relevant|unrelated|emotionally-draining|clickbait" }
Only return raw JSON array.
```

**User-facing control:**
- Slider: "Recommendation Sensitivity" (0 = show all, 100 = only very relevant)
- Toggle: "Hide Clickbait / Emotionally Draining"

> [!TIP]
> This only runs ONCE per page load (when the video title and sidebar are both loaded). It does NOT re-run on scroll to avoid excessive API calls.

---

## Feature 3: Focus Mode — Chapter Summaries + AI Key Points

### Problem
Long videos are hard to follow without structure. Chapter summaries and key moments help.

### Implementation

**File:** `src/youtube/focusMode.js`

**Two-layer approach:**

#### Layer A — Native Chapters (free, instant)
YouTube already embeds chapters in the progress bar. We extract them:
```javascript
// YouTube stores chapters in the progress bar tooltip
const chapters = document.querySelectorAll('.ytp-chapter-title-content');
```
Display these as a clean chapter list in the Synapse floating panel.

#### Layer B — AI-Generated Summary (when no chapters exist)
```
1. Extract the video's auto-generated transcript:
   → YouTube exposes this at: youtube.com/api/timedtext?v={videoId}&lang=en
   → Fetch via: chrome.runtime.sendMessage({ action: 'fetch_transcript', videoId })
   → background.js fetches this URL and returns the XML

2. Parse the transcript XML into ~5-minute chunks

3. Each chunk → Groq → returns { time: "mm:ss", keyPoint: "..." }

4. Render a "Key Moments" panel on the right side of the video
```

**Focus Mode UI overlay:**
```
┌─────────────────────────────────────────────┐
│  🧠 FOCUS MODE                              │
│  ─────────────────────────────────────────  │
│  00:00  Introduction & setup                │
│  04:30  The main argument                   │
│  11:20  Evidence & examples                 │
│  18:00  Conclusion                          │
│  ─────────────────────────────────────────  │
│  [Click any point to jump]                  │
└─────────────────────────────────────────────┘
```

**Side effect:** Clicking any chapter point calls `videoEl.currentTime = seconds` to instantly jump.

---

## Feature 4: Comment Shield

### Problem
Comment sections are unpredictable, often hostile, and cognitively overwhelming.

### Implementation

**File:** `src/youtube/commentShield.js`

**Three modes (user picks one):**

| Mode | Behaviour |
|------|-----------|
| **Hide All** | `ytd-comments { display: none }` — simple CSS injection |
| **Summary Only** | AI reads top 20 comments, returns "What people are saying" as 3 bullet points |
| **Filter** | Hides comments shorter than 15 chars or containing a configurable blocklist |

**Comment Summary prompt:**
```
Here are the top YouTube comments for a video titled "${videoTitle}":
${top20Comments}

Summarize what people are saying in 3 clear, factual bullet points.
Avoid negativity. Focus on what information or reactions are common.
Return ONLY JSON: { "summary": ["...", "...", "..."] }
```

**UI placement:** The Comment Shield toggle is always visible in the Synapse floating panel while on YouTube.

> [!WARNING]
> YouTube's comment section is lazy-loaded and renders inside `ytd-comments`. We use a `MutationObserver` to watch for it and apply the shield immediately when it appears, before the user scrolls to it.

---

## Feature 5: Shorts Guard — Pacing & Stop Reminders

### Problem
Shorts autoplay endlessly. The transition between clips is instant with no breathing room.

### Implementation

**File:** `src/youtube/shortsGuard.js`

**Detection:** We're on Shorts when `window.location.href.includes('/shorts/')`.

#### Sub-feature A: Pause Between Shorts
```javascript
// Intercept navigation to next Short
const observer = new MutationObserver(() => {
    if (window.location.href.includes('/shorts/')) {
        const video = document.querySelector('video');
        if (video) {
            video.pause();
            showBreathingOverlay(); // 3-second gentle overlay before next Short plays
        }
    }
});
observer.observe(document.body, { subtree: true, childList: true });
```

**Breathing overlay:**
```
┌──────────────────────┐
│                      │
│    Take a breath.    │
│    ────────────      │
│       ● ● ●          │ ← Animated dots
│                      │
│  [Continue →]        │
└──────────────────────┘
```
Auto-dismisses after 3 seconds OR on click.

#### Sub-feature B: Screen Time Reminder
```javascript
// Use chrome.alarms API
chrome.alarms.create('synapse-shorts-reminder', { delayInMinutes: 15 });
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'synapse-shorts-reminder') {
        injectShortsTimeoutBanner(); // Gentle "You've been watching for 15 min" banner
    }
});
```

**Banner design:** Non-blocking, slides in from bottom, dismissible, shows time watched.

---

## Floating Control Panel (YouTube HUD)

All features are surfaced in a single, always-visible floating panel injected into YouTube:

```
┌────────────────────────────────┐
│  ✨ Synapse                     │
│  ─────────────────────────────  │
│  🔊 Audio Guard      [●──────]  │
│  📋 Recommendations  [●──────]  │
│  🧠 Focus Mode       [──────●]  │
│  💬 Comments         [●──────]  │
│  ⏸  Shorts Guard     [●──────]  │
│  ─────────────────────────────  │
│  ⏱ Watching: 12 min             │
└────────────────────────────────┘
```

- Draggable (positioned bottom-right by default)
- Collapsed to just the ✨ icon when user drags to edge
- State persisted to `chrome.storage.sync` across sessions

---

## Phased Build Roadmap

### Phase 1 — Foundation (Week 1)
- [ ] Create `youtube.js` content script
- [ ] Add `youtube.com` match to `manifest.json`
- [ ] Add `storage` + `alarms` permissions
- [ ] Build the floating HUD panel (always visible on YT)
- [ ] Persist HUD state to `chrome.storage.sync`

### Phase 2 — Audio & Comments (Week 1-2)
- [ ] Implement `audioGuard.js` with Web Audio API
- [ ] Implement `commentShield.js` with MutationObserver
- [ ] Wire both to HUD toggles

### Phase 3 — Shorts Guard (Week 2)
- [ ] Implement `shortsGuard.js` navigation interceptor
- [ ] Build breathing overlay UI
- [ ] Implement `chrome.alarms` screen-time reminder

### Phase 4 — AI Features (Week 2-3)
- [ ] Extend `background.js` to handle `score_recommendations` action
- [ ] Implement `recFilter.js` with Groq scoring
- [ ] Implement `focusMode.js` — Layer A (native chapters)
- [ ] Implement `focusMode.js` — Layer B (transcript + AI key points)

### Phase 5 — Polish & Testing (Week 3)
- [ ] Write `youtube.test.js` unit tests for each module
- [ ] Test on YouTube homepage, video page, and Shorts
- [ ] Handle YouTube's SPA navigation (pushState changes, not full reloads)
- [ ] Performance audit (ensure no jank on video playback)

---

## Key Technical Challenges

| Challenge | Solution |
|-----------|----------|
| YouTube is a SPA — URL changes without page reload | `MutationObserver` + `navigation` API event listener |
| YouTube frequently changes DOM selectors | Use resilient attribute selectors (`[data-testid]`, `ytd-*` custom elements) + fallbacks |
| AudioContext requires user gesture | Lazy-init on first click, show "click to activate audio guard" prompt |
| Transcript API may not always be available | Graceful fallback to "No transcript available — chapter summary unavailable" |
| Shorts autoplay is handled by YouTube's own JS | Intercept via `video.pause()` on navigation event, not by blocking fetch |

---

## Open Questions for You

> [!IMPORTANT]
> **1. Groq budget**: The Recommendation Scorer and Chapter Summarizer both hit the Groq API. Should we only run them on user-request (click to generate) or automatically on page load?

> [!IMPORTANT]
> **2. Shorts breathing gap**: Should the 3-second pause be skippable immediately, or should we enforce a minimum wait (e.g., 1.5 seconds before the "Continue" button appears)?

> [!IMPORTANT]
> **3. Comment Summary vs Hide**: Should "Hide All" be the default for comments (safest for sensory overload), or "Summary Only" (more informative)?

> [!IMPORTANT]
> **4. HUD position**: Should the HUD be draggable-free or should we snap it to a fixed position (e.g., always bottom-right) to keep things predictable for users who prefer consistency?
