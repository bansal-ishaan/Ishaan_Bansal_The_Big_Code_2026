// src/youtube/visual/shortsGuard.js
// Only keeps the shorts watch-time timer as requested.

window.initShortsGuard = function() {
    let isEnabled = false;
    let shortsWatchTimeSec = 0;
    let timerInterval = null;

    function isShortsPage() {
        return window.location.href.includes('/shorts/');
    }

    function createTimerUI() {
        if (document.getElementById('synapse-shorts-timer')) return;
        const timerUI = document.createElement('div');
        timerUI.id = 'synapse-shorts-timer';
        timerUI.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: rgba(15,23,42,0.9); border: 1px solid rgba(129,140,248,0.3);
            border-radius: 12px; padding: 10px 16px; color: #a5b4fc;
            font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: bold;
            z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: none; backdrop-filter: blur(4px);
        `;
        timerUI.innerHTML = `⏱️ Shorts Session: <span id="synapse-shorts-time-val">0m 0s</span>`;
        document.body.appendChild(timerUI);
    }

    function updateTimerUI() {
        const val = document.getElementById('synapse-shorts-time-val');
        if (val) {
            const m = Math.floor(shortsWatchTimeSec / 60);
            const s = shortsWatchTimeSec % 60;
            val.textContent = `${m}m ${s}s`;
        }
    }

    function removeTimerUI() {
        const t = document.getElementById('synapse-shorts-timer');
        if (t) t.remove();
    }

    function manageTimer() {
        if (isEnabled && isShortsPage()) {
            createTimerUI();
            if (!timerInterval) {
                timerInterval = setInterval(() => {
                    const video = document.querySelector('video');
                    if (video && !video.paused && !video.ended) {
                        shortsWatchTimeSec++;
                        updateTimerUI();
                    }
                }, 1000);
            }
        } else {
            removeTimerUI();
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (!isShortsPage()) shortsWatchTimeSec = 0;
        }
    }

    const observer = new MutationObserver(manageTimer);

    return {
        enable: () => {
            if (isEnabled) return;
            isEnabled = true;
            observer.observe(document.body, { childList: true, subtree: true });
            manageTimer();
        },
        disable: () => {
            isEnabled = false;
            observer.disconnect();
            removeTimerUI();
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }
    };
};