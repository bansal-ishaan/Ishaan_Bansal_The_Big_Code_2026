// Media Control: Pauses videos and blurs images so they don't distract you.
// You can still see the media by hovering your mouse over it.

export function applyMediaControl() {
    // Immediately pause all autoplaying videos
    document.querySelectorAll('video').forEach(v => {
        v.pause();
        v.autoplay = false;
        v.removeAttribute('autoplay');
    });

    if (!document.getElementById('neuro-media-control')) {
        const style = document.createElement('style');
        style.id = 'neuro-media-control';
        style.innerHTML = `
            img, video, iframe {
                filter: blur(10px) grayscale(50%) !important;
                transition: filter 0.3s ease !important;
            }
            img:hover, video:hover, iframe:hover {
                filter: blur(0px) grayscale(0%) !important;
            }
        `;
        document.head.appendChild(style);
    }
}
