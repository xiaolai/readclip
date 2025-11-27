import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import type { Article } from '../types';

export class ContentExtractor {
    private document: Document;

    constructor(document: Document) {
        this.document = document;
    }

    public extract(): Article | null {
        // 1. Resolve relative URLs before parsing
        const baseURI = this.document.baseURI;
        const clone = this.document.cloneNode(true) as Document;

        // Fix relative links and images in the clone
        const elements = clone.querySelectorAll('img, a');
        elements.forEach((el) => {
            if (el instanceof HTMLImageElement && el.getAttribute('src')) {
                try {
                    el.src = new URL(el.getAttribute('src')!, baseURI).href;
                } catch (e) { /* ignore invalid URLs */ }
            }
            if (el instanceof HTMLAnchorElement && el.getAttribute('href')) {
                try {
                    el.href = new URL(el.getAttribute('href')!, baseURI).href;
                } catch (e) { /* ignore */ }
            }
        });

        // Readability works on the cloned document
        const reader = new Readability(clone);
        const article = reader.parse();

        if (!article) {
            return null;
        }

        // Sanitize the content but allow images
        const cleanContent = DOMPurify.sanitize(article.content || '', {
            ADD_TAGS: ['img', 'figure', 'figcaption'],
            ADD_ATTR: ['src', 'alt', 'title', 'width', 'height']
        });

        return {
            title: article.title || '',
            content: cleanContent,
            textContent: article.textContent || '',
            length: article.length || 0,
            excerpt: article.excerpt || '',
            byline: article.byline || '',
            dir: article.dir || '',
            siteName: article.siteName || '',
            lang: article.lang || '',
            publishedTime: article.publishedTime || null,
        };
    }
}
