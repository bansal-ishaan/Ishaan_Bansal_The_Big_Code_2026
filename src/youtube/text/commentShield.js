// src/youtube/text/commentShield.js
// Only keeps the comment section hidden as requested.

window.initCommentShield = function() {
    let mode = 'hide';

    function apply() {
        const style = document.getElementById('synapse-comment-shield-style') || document.createElement('style');
        style.id = 'synapse-comment-shield-style';
        style.innerHTML = mode === 'hide' ? 'ytd-comments { display: none !important; }' : '';
        if (!style.parentElement) document.head.appendChild(style);
    }

    return {
        init: () => {
            apply();
            // Watch for dynamic elements being added by YouTube SPA
            const obs = new MutationObserver(apply);
            obs.observe(document.body, { childList: true, subtree: true });
        },
        setMode: (m) => {
            mode = m;
            apply();
        }
    };
};