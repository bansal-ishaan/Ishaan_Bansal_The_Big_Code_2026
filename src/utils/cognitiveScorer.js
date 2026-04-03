// Cognitive Scorer: This calculates how "heavy" or complex a page feels.
// It looks at word length, sentence complexity, and how many distracting 
// links are on the page to give a score from 0 to 100.

export function calculateCognitiveLoad(contentMap) {
    if (!contentMap || contentMap.length === 0) {
        return { overallLoad: 0, readingGrade: 0, clutterMetric: 0, message: "No text data extracted." };
    }

    // Score only text nodes; images don't contribute to reading complexity
    const totalText = contentMap
        .filter(t => t.tag !== 'IMG' && t.tag !== 'PICTURE')
        .map(t => t.text)
        .join(' ');

    const sentences = totalText.split(/[.!?]+/).filter(Boolean).length || 1;
    const words     = totalText.split(/\s+/).filter(Boolean).length    || 1;

    let syllables = 0;
    totalText.split(/\s+/).forEach(w => {
        const matches = w.match(/[aeiouy]{1,2}/gi);
        let count = matches ? matches.length : 1;
        if (w.endsWith('e')) count--;
        syllables += Math.max(count, 1);
    });

    // Flesch-Kincaid Grade Level formula
    let readingGrade = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
    readingGrade = Math.max(0, Math.min(Math.round(readingGrade * 10) / 10, 20));

    // Link density adds significant cognitive noise for ADHD/Dyslexia
    const linksOnPage = typeof document !== 'undefined'
        ? document.querySelectorAll('a').length
        : 0;

    const loadScore = (readingGrade * 4.5) + (linksOnPage * 0.05);

    return {
        overallLoad:   Math.round(Math.min(loadScore, 100)),
        readingGrade,
        clutterMetric: linksOnPage,
        message: loadScore > 65
            ? "High Cognitive Load — simplification highly recommended."
            : "Manageable complexity."
    };
}
