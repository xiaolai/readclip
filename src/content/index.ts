import { ContentExtractor } from '../core/extraction/ContentExtractor';

console.log('Content script loaded.');

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Message received in content script:', message);

    if (message.type === 'EXTRACT_CONTENT') {
        try {
            const extractor = new ContentExtractor(document);
            const article = extractor.extract();

            if (article) {
                // Add source URL to the article
                article.url = window.location.href;
                sendResponse({ success: true, data: article });
            } else {
                sendResponse({ success: false, error: 'Could not extract content' });
            }
        } catch (error) {
            console.error('Extraction failed:', error);
            sendResponse({ success: false, error: (error as Error).message });
        }
    }
});
