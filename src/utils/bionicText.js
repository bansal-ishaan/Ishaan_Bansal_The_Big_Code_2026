// Bionic Reading: helps people with ADHD focus by bolding the start of each word.
// It also wraps words in spans so our TTS reader can highlight them in real-time.

export function formatBionicText(text) {
    if (!text) return "";

    return text.split(' ').map(word => {
        // Pass through HTML tags without mangling them
        if (word.includes('<') || word.length === 0) {
            return `<span class="neuro-tts-word" style="transition:0.15s ease;">${word}</span>`;
        }

        let letterCount = 0;
        const cleanLen = word.replace(/[^a-zA-Z0-9]/g, '').length;
        if (cleanLen === 0) {
            return `<span class="neuro-tts-word" style="transition:0.15s ease;">${word}</span>`;
        }

        // Bold the first ⌈len/2⌉ alphanumeric characters
        const boldCount = cleanLen === 1 ? 1 : Math.ceil(cleanLen / 2);
        let bPart = "";
        let rPart = "";

        for (let i = 0; i < word.length; i++) {
            if (/[a-zA-Z0-9]/.test(word[i])) letterCount++;
            if (letterCount <= boldCount) bPart += word[i];
            else rPart += word[i];
        }

        return `<span class="neuro-tts-word" style="transition:0.15s ease;"><b class="neuro-bionic" style="font-weight:inherit;">${bPart}</b>${rPart}</span>`;
    }).join(' ');
}
