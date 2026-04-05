document.addEventListener('DOMContentLoaded', async () => {
    const btns = document.querySelectorAll('.mode-btn');
    const desc = document.getElementById('mode-desc');
    const errorBox = document.getElementById('error-box');
    const activateBtn = document.getElementById('activate-btn');

    let currentMode = 'text';

    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url || '';
    const isYouTube = url.includes('youtube.com');

    function checkUsecase() {
        if (currentMode === 'text') {
            desc.textContent = "Simplifies web layouts and text for cognitive accessibility. Focuses on articles and blogs.";
            if (isYouTube) {
                errorBox.style.display = 'block';
                errorBox.textContent = "Error: The Textual Analysis pipeline cannot be applied to YouTube. Please switch to YouTube mode.";
                activateBtn.disabled = true;
            } else {
                errorBox.style.display = 'none';
                activateBtn.disabled = false;
            }
        } else if (currentMode === 'youtube') {
            desc.textContent = "Filters video recommendations, comments, and manages audio for a calmer viewing experience.";
            activateBtn.textContent = "Process This Page";
            if (!isYouTube) {
                errorBox.style.display = 'block';
                errorBox.textContent = "Error: The YouTube Analysis pipeline can only be used on youtube.com.";
                activateBtn.disabled = true;
            } else {
                errorBox.style.display = 'none';
                activateBtn.disabled = false;
            }
        } else if (currentMode === 'vision') {
            desc.textContent = "Analyzes diagrams or visuals on your screen using Vision AI and provides an audio explainer.";
            activateBtn.textContent = "Capture Screen & Analyze";
            errorBox.style.display = 'none';
            activateBtn.disabled = false;
        }
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            checkUsecase();
        });
    });

    // Handle initial state depending on URL
    if (isYouTube) {
        btns[1].click(); // Select YouTube by default on YT
    } else {
        checkUsecase();
    }

    activateBtn.addEventListener('click', () => {
        if (activateBtn.disabled) return;

        activateBtn.textContent = 'Starting...';
        activateBtn.disabled = true;

        if (currentMode === 'text') {
            chrome.runtime.sendMessage({ action: "start_article_analysis", tabId: tab.id });
            window.close();
        } else if (currentMode === 'youtube') {
            chrome.tabs.sendMessage(tab.id, { action: "activate_youtube_mode" }, (res) => {
                window.close();
            });
        } else if (currentMode === 'vision') {
            // Trigger capturing logic in content script
            chrome.tabs.sendMessage(tab.id, { action: "start_vision_analysis" }, (res) => {
                window.close();
            });
        }
    });
});
