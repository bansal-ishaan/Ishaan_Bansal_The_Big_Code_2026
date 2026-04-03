/**
 * @jest-environment jsdom
 */

const { applyMediaControl, extractAndTagContent, applyLLMModifications } = require('./content.js');

describe('DOM Extraction Phase', () => {
    beforeEach(() => {
        // Reset DOM before each test
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    test('extractAndTagContent maps DOM correctly and provides IDs', () => {
        document.body.innerHTML = `
            <main>
                <h1>This is a sufficiently long main heading here</h1>
                <p>This is a sufficiently long paragraph that should be extracted by the module.</p>
                <p>Short</p> <!-- Too short, should be ignored -->
                <li>Another valid list item that has enough text to be extracted.</li>
            </main>
        `;

        const result = extractAndTagContent();
        
        expect(result.contentMap.length).toBe(3); // h1, first p, li
        expect(result.contentMap[0].tag).toBe('H1');
        expect(result.contentMap[0].text).toBe('This is a sufficiently long main heading here');
        expect(result.contentMap[0].id).toBe('neuro-id-0');

        // Check if DOM was mutated with data attributes
        const h1 = document.querySelector('h1');
        expect(h1.getAttribute('data-neuro-id')).toBe('neuro-id-0');
    });

    test('applyMediaControl blurs images and pauses auto-playing videos', () => {
        document.body.innerHTML = `
            <video autoplay id="myvideo"></video>
            <img src="test.jpg" />
        `;
        
        // Mock the pause function since JSDOM doesn't implement media playback
        const video = document.getElementById('myvideo');
        video.pause = jest.fn();

        applyMediaControl();

        expect(video.pause).toHaveBeenCalled();
        expect(video.autoplay).toBe(false);

        // Check if CSS injected
        const style = document.getElementById('neuro-media-control');
        expect(style).not.toBeNull();
        expect(style.innerHTML).toContain('blur');
    });

    test('applyLLMModifications successfully replaces targeted text from AI payload', () => {
        document.body.innerHTML = `
            <main>
                <p data-neuro-id="neuro-id-5">Complex, difficult to parse sentence.</p>
            </main>
        `;

        // Simulate Claude's JSON response
        const mockLLMResponse = [{
            id: 'neuro-id-5',
            modified_text: 'Simplified sentence.'
        }];

        applyLLMModifications(mockLLMResponse);

        // Verify text was swapped
        const p = document.querySelector('p');
        expect(p.innerHTML).toBe('Simplified sentence.');
    });
});
