/**
 * @jest-environment jsdom
 */

const { 
    applyMediaControl, 
    extractAndTagContent, 
    calculateCognitiveLoad, 
    formatBionicText,
    renderAIMetadata,
    renderAIChunk,
    updateAIStatus
} = require('./content.js');

describe('Synapse Content Module — Core Logic', () => {

    beforeEach(() => {
        // Reset DOM before each test
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Mock window.getComputedStyle to avoid jsdom failures
        window.getComputedStyle = jest.fn().mockReturnValue({ display: 'block' });
        
        // Mock speechSynthesis
        window.speechSynthesis = {
            cancel: jest.fn(),
            speak: jest.fn()
        };
        global.SpeechSynthesisUtterance = jest.fn();
    });

    // ────────────────────────────────────────────────────────
    //  1. BIONIC READING ENGINE
    // ────────────────────────────────────────────────────────
    describe('formatBionicText', () => {
        test('correctly bolds simple words following the (cleanLen/2) rule', () => {
            // "Hello" -> 5 letters -> bold 3
            const result = formatBionicText('Hello');
            expect(result).toContain('<span class="neuro-tts-word"><b class="neuro-bionic" style="font-weight:inherit;">Hel</b>lo</span>');
        });

        test('handles short words correctly (1 letter bolded, 2 letters bolded)', () => {
            expect(formatBionicText('A')).toContain('<span class="neuro-tts-word"><b class="neuro-bionic" style="font-weight:inherit;">A</b></span>');
            expect(formatBionicText('Go')).toContain('<span class="neuro-tts-word"><b class="neuro-bionic" style="font-weight:inherit;">G</b>o</span>');
        });

        test('skips strings containing < bracket (e.g. malformed or partial tags)', () => {
            const result = formatBionicText('Testing <img> logic');
            expect(result).toContain('<span class="neuro-tts-word"><img></span>');
        });

        test('handles punctuation at word boundaries', () => {
             const result = formatBionicText('Read.');
             // Read. -> 4 letters -> bold 2
             expect(result).toContain('<span class="neuro-tts-word"><b class="neuro-bionic" style="font-weight:inherit;">Re</b>ad.</span>');
        });
    });

    // ────────────────────────────────────────────────────────
    //  2. COGNITIVE LOAD ANALYZER
    // ────────────────────────────────────────────────────────
    describe('calculateCognitiveLoad', () => {
        test('returns scores based on text complexity', () => {
            const content = [
                { tag: 'P', text: 'This is a very simple sentence.' },
                { tag: 'P', text: 'This represents something much more complex and sophisticated in terms of linguistic structure.' }
            ];
            const score = calculateCognitiveLoad(content);
            expect(score.readingGrade).toBeGreaterThan(0);
            expect(score.overallLoad).toBeGreaterThan(0);
        });

        test('returns zero values for empty content', () => {
            const score = calculateCognitiveLoad([]);
            expect(score.overallLoad).toBe(0);
            expect(score.message).toBe('No text extracted.');
        });

        test('handles massive amount of links (clutter metric)', () => {
             document.body.innerHTML = '<a>Link1</a><a>Link2</a><a>Link3</a>';
             const content = [{ tag: 'P', text: 'Some basic text here.' }];
             const score = calculateCognitiveLoad(content);
             expect(score.clutterMetric).toBe(3);
        });
    });

    // ────────────────────────────────────────────────────────
    //  3. MEDIA & FOCUS CONTROL
    // ────────────────────────────────────────────────────────
    describe('applyMediaControl', () => {
        test('pauses autoplaying videos and injects blur styles', () => {
            document.body.innerHTML = `
                <video id="v1" autoplay></video>
                <img id="img1" src="test.jpg" />
            `;
            const video = document.getElementById('v1');
            video.pause = jest.fn();
            
            applyMediaControl();
            
            expect(video.pause).toHaveBeenCalled();
            expect(video.autoplay).toBe(false);
            
            const style = document.getElementById('neuro-media-control');
            expect(style).not.toBeNull();
            expect(style.innerHTML).toContain('filter: blur(10px)');
        });
    });

    // ────────────────────────────────────────────────────────
    //  4. DOM EXTRACTION PIPELINE
    // ────────────────────────────────────────────────────────
    describe('extractAndTagContent', () => {
        test('extracts primary text while ignoring sidebars/junk', () => {
            document.body.innerHTML = `
                <nav>Menu link</nav>
                <main>
                    <h1>This is a sufficiently long heading that we can extract</h1>
                    <p>This is a valid long paragraph that should be extracted from the main container correctly.</p>
                    <aside class="promo-sidebar">Buy these socks now!</aside>
                    <div class="footer-ad">Ad space here</div>
                </main>
            `;

            const result = extractAndTagContent();
            
            expect(result.contentMap.length).toBe(2);
            expect(result.contentMap[0].tag).toBe('H1');
            expect(result.contentMap[1].tag).toBe('P');
            
            const p = document.querySelector('p');
            expect(p.hasAttribute('data-neuro-id')).toBe(true);
        });

        test('works with platform-specific Indian news selectors', () => {
             document.body.innerHTML = `
                 <div class="_3WlLe">
                     <p>This is from NDTV or Times of India's custom classes which we support explicitly.</p>
                 </div>
             `;
             const result = extractAndTagContent();
             expect(result.contentMap.length).toBe(1);
             expect(result.contentMap[0].text).toContain('NDTV');
        });

        test('protects code blocks from modification', () => {
            document.body.innerHTML = `
                <main>
                    <pre><code>function main() { return 0; }</code></pre>
                </main>
            `;
            const result = extractAndTagContent();
            expect(result.contentMap[0].protect).toBe(true);
            const tagged = document.querySelectorAll('[data-neuro-protect="true"]');
            expect(tagged.length).toBeGreaterThan(0);
        });

        test('skips elements that are too short (noise/junk)', () => {
            document.body.innerHTML = `
                <main>
                    <p>Too short</p>
                    <p>This paragraph is long enough to be included in the extraction result safely.</p>
                </main>
            `;
            const result = extractAndTagContent();
            expect(result.contentMap.length).toBe(1);
            expect(result.contentMap[0].text).toContain('long enough');
        });

        test('limits extraction to avoid processing too many elements (120 chunks)', () => {
             let html = '<main>';
             for(let i=0; i<150; i++) {
                 html += `<p>This is valid paragraph number ${i} which is long enough to be extracted.</p>`;
             }
             html += '</main>';
             document.body.innerHTML = html;
             
             const result = extractAndTagContent();
             expect(result.contentMap.length).toBe(120);
        });
    });

    // ────────────────────────────────────────────────────────
    //  5. ZEN INTERFACE RENDERING
    // ────────────────────────────────────────────────────────
    describe('UI Rendering Helpers', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="neuro-root-wrapper">
                    <div id="neuro-right-content">
                        <div id="neuro-ai-metadata"></div>
                        <div id="neuro-ai-chunks"></div>
                        <div id="neuro-ai-status"><h3 id="neuro-status-text"></h3></div>
                    </div>
                </div>
            `;
        });

        test('updateAIStatus updates the text element correctly', () => {
            updateAIStatus('Testing...');
            expect(document.getElementById('neuro-status-text').innerText).toBe('Testing...');
        });

        test('renderAIMetadata populates summary box', () => {
            const data = { page_summary: 'Small summary here.', page_tone: 'Positive' };
            renderAIMetadata(data);
            
            const metaBox = document.getElementById('neuro-ai-metadata');
            expect(metaBox.innerHTML).toContain('Small summary here');
            expect(metaBox.innerHTML).toContain('Positive');
        });

        test('renderAIChunk appends new cards with emotion badges', () => {
            const data = {
                simplified_chunks: [{
                    emotion: 'sarcastic',
                    heading: 'Insight Heading',
                    bullet_points: ['Point 1', 'Point 2']
                }]
            };
            renderAIChunk(data);
            
            const chunksBox = document.getElementById('neuro-ai-chunks');
            expect(chunksBox.innerHTML).toContain('sarcastic');
            expect(chunksBox.innerHTML).toContain('Point 1');
            expect(chunksBox.innerHTML).toContain('😏'); 
            expect(chunksBox.innerHTML).toContain('Insight Heading');
        });
    });

});
