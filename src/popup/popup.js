// src/popup/popup.js
// Compact, minimal logic for the Synapse neuro-inclusive popup.

document.addEventListener('DOMContentLoaded', async () => {
    const tabs = document.querySelectorAll('.tab');
    const infoEl = document.getElementById('mode-info');
    const actionBtn = document.getElementById('action-btn');
    const selector = document.querySelector('.tabs');

    let currentMode = 'text';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isYouTube = tab.url?.includes('youtube.com');

    const MODES = {
        text: {
            info: 'Simplify page content for easier reading and focus.',
            btn: 'Simplify Page'
        },
        vision: {
            info: 'Explain complex charts or diagrams using Vision AI.',
            btn: 'Explore Visuals'
        }
    };

    function updateUI() {
        if (isYouTube) {
            selector.style.display = 'none';
            infoEl.textContent = 'A comment toggle appears directly on the YouTube video row.';
            actionBtn.textContent = 'Use Page Toggle';
            actionBtn.disabled = true;
            return;
        }

        selector.style.display = 'flex';
        actionBtn.disabled = false;

        const config = MODES[currentMode];
        infoEl.textContent = config.info;
        actionBtn.textContent = config.btn;

        // Reset fade animation
        infoEl.classList.remove('fade-in');
        void infoEl.offsetWidth; // Trigger reflow
        infoEl.classList.add('fade-in');
    }

    tabs.forEach(t => {
        t.addEventListener('click', () => {
            tabs.forEach(bt => {
                bt.classList.remove('active');
                bt.setAttribute('aria-selected', 'false');
            });
            t.classList.add('active');
            t.setAttribute('aria-selected', 'true');
            currentMode = t.dataset.mode;
            updateUI();
        });
    });

    actionBtn.addEventListener('click', () => {
        if (actionBtn.disabled) return;
        actionBtn.textContent = 'Loading...';
        actionBtn.disabled = true;

        if (currentMode === 'text') {
            chrome.runtime.sendMessage({ action: 'start_article_analysis', tabId: tab.id });
            window.close();
        } else if (currentMode === 'vision') {
            chrome.tabs.sendMessage(tab.id, { action: 'start_vision_analysis' }, () => {
                window.close();
            });
        }
    });

    updateUI();
});
