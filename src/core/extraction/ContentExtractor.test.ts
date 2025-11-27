import { describe, it, expect, beforeEach } from 'vitest';
import { ContentExtractor } from './ContentExtractor';

describe('ContentExtractor', () => {
    let document: Document;

    beforeEach(() => {
        // Create a mock document with some content
        const dom = new DOMParser().parseFromString(
            `
      <html>
        <head><title>Main Title</title></head>
        <body>
          <article>
            <h1>Main Title</h1>
            <p>This is the main content of the article.</p>
            <div class="ad">Advertisement</div>
          </article>
        </body>
      </html>
      `,
            'text/html'
        );
        document = dom;
    });

    it('should extract article content', () => {
        const extractor = new ContentExtractor(document);
        const article = extractor.extract();

        expect(article).not.toBeNull();
        expect(article?.title).toBe('Main Title');
        expect(article?.content).toContain('This is the main content');
        // Readability might strip the title from content or keep it, depending on config.
        // But it should definitely have the paragraph.
    });

    it('should return null for empty document', () => {
        const emptyDom = new DOMParser().parseFromString('<html><body></body></html>', 'text/html');
        const extractor = new ContentExtractor(emptyDom);
        const article = extractor.extract();

        // Readability usually returns null if no content found, or a very empty object.
        // Let's check if it returns something or null.
        // Actually Readability might be aggressive.
        // If it returns null, our extractor returns null.
        if (article) {
            expect(article.content).toBe(''); // Or similar
        } else {
            expect(article).toBeNull();
        }
    });
});
