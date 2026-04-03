// Read Aloud Engine: Highlighting words as they are spoken.
// This helps people with ADHD or Dyslexia follow along with the text.
// It also announces the "vibe" (emotion) before it starts reading the paragraph.

export function initTTSEngine() {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('neuro-tts-btn')) return;

        const textToSpeak = e.target.getAttribute('data-text');
        const isPlaying   = e.target.innerText.includes('Stop');

        // Cancel any currently playing speech and clean up state
        window.speechSynthesis.cancel();

        document.querySelectorAll('.neuro-tts-word').forEach(w => {
            w.style.backgroundColor = 'transparent';
            w.style.color           = '';
            w.style.boxShadow       = 'none';
        });
        document.querySelectorAll('.neuro-tts-btn').forEach(btn => {
            btn.innerText = btn.classList.contains('neuro-tts-tldr')
                ? '🔊 Listen'
                : '🔊 Speak';
        });

        if (isPlaying) return; // Toggle off — already cancelled above

        // ── START SPEAKING ────────────────────────────────────────────────────
        e.target.innerText = '⏹ Stop';

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate  = 0.85; // Slower pace for neurodivergent accessibility

        // Scope the word spans to THIS card's parent container only
        const container = e.target.parentElement;
        const domWords  = Array.from(container.querySelectorAll('.neuro-tts-word'));

        // ── KARAOKE WORD HIGHLIGHTER ──────────────────────────────────────────
        utterance.onboundary = (event) => {
            if (event.name !== 'word') return;

            // Clear previous word highlight
            domWords.forEach(w => {
                w.style.backgroundColor = 'transparent';
                w.style.color           = '';
                w.style.boxShadow       = 'none';
            });

            // Map charIndex position → word index in our tagged DOM spans
            const textUpToChar = textToSpeak.substring(0, event.charIndex);
            const wordIndex    = textUpToChar.split(' ').length - 1;

            if (domWords[wordIndex]) {
                domWords[wordIndex].style.backgroundColor = 'rgba(129, 140, 248, 0.4)';
                domWords[wordIndex].style.color           = '#ffffff';
                domWords[wordIndex].style.borderRadius    = '4px';
                domWords[wordIndex].style.boxShadow       = '0 0 8px rgba(129, 140, 248, 0.3)';
            }
        };

        // ── CLEANUP ON FINISH ─────────────────────────────────────────────────
        utterance.onend = () => {
            e.target.innerText = e.target.classList.contains('neuro-tts-tldr')
                ? '🔊 Listen'
                : '🔊 Speak';
            domWords.forEach(w => {
                w.style.backgroundColor = 'transparent';
                w.style.color           = '';
                w.style.boxShadow       = 'none';
            });
        };

        window.speechSynthesis.speak(utterance);
    });
}
