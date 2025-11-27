import { DebuggerService } from '../../services/chrome/debugger';
import { sendMessage } from '../../services/chrome/messaging';
import type { Article } from '../../core/types';

import contentScriptPath from '../../content/index.ts?script';

async function injectContentScript(tabId: number) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [contentScriptPath]
        });
        console.log('Content script injected successfully');
    } catch (error) {
        const errorMessage = (error as Error).message || '';
        // Only ignore if script is already injected (duplicate injection)
        if (errorMessage.includes('Cannot access a chrome://') ||
            errorMessage.includes('Cannot access a chrome-extension://')) {
            throw new Error('Cannot extract content from this page type');
        }
        // For "already injected" type errors, log and continue
        console.log('Content script injection note:', errorMessage);
    }
}

function waitForMessage(type: string, senderTabId: number, timeoutMs = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
        const listener = (message: any, sender: chrome.runtime.MessageSender) => {
            if (message.type === type && sender.tab?.id === senderTabId) {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(message.payload);
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            reject(new Error(`Timeout waiting for message: ${type}`));
        }, timeoutMs);
    });
}

/**
 * Extract article from a tab without generating PDF.
 * Used by the side panel to display reader view.
 */
export async function extractForSidePanel(tabId: number): Promise<Article> {
    console.log('Extracting for side panel, tab:', tabId);

    try {
        // 1. Inject content script if needed
        await injectContentScript(tabId);

        // 2. Extract content
        const response = await sendMessage<{ success: boolean; data?: Article; error?: string }>(
            tabId,
            { type: 'EXTRACT_CONTENT' }
        );

        if (!response || !response.success || !response.data) {
            throw new Error(response?.error || 'Failed to extract content');
        }

        console.log('Extracted article:', response.data.title);
        return response.data;

    } catch (error) {
        console.error('Side panel extraction failed:', error);
        throw error;
    }
}

/**
 * Generate PDF from article data provided by the side panel.
 * Uses a hidden reader tab for PDF generation.
 */
export async function generatePDFFromSidePanel(article: Article): Promise<string> {
    console.log('Generating PDF from side panel:', article.title);

    let readerTabId: number | undefined;

    try {
        // 1. Store article temporarily
        await chrome.storage.local.set({ currentArticle: article });

        // 2. Create hidden reader tab
        const readerTab = await chrome.tabs.create({
            url: chrome.runtime.getURL('src/ui/reader/index.html'),
            active: false // Keep in background - no visible tab switch
        });

        readerTabId = readerTab.id;
        if (!readerTabId) {
            throw new Error('Failed to create reader tab');
        }

        // 3. Wait for reader to be ready
        console.log('Waiting for reader to be ready...');
        await waitForMessage('READER_READY', readerTabId);

        // 4. Attach debugger and generate PDF
        console.log('Attaching debugger...');
        const debuggerService = new DebuggerService(readerTabId);

        try {
            await debuggerService.attach();

            console.log('Generating PDF...');
            const pdfBase64 = await debuggerService.printToPDF({
                printBackground: true,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
            });

            // 5. Generate filename: title_sitename_datetime.pdf
            const sanitize = (str: string, maxLen = 80) => str.replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, maxLen);
            const title = article.title ? sanitize(article.title) : '';
            const siteName = article.siteName ? sanitize(article.siteName, 30) : '';
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const parts = [title, siteName, timestamp].filter(Boolean);
            const filename = `${parts.join('_')}.pdf`;

            // 6. Download via downloads API
            const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
            await chrome.downloads.download({
                url: dataUrl,
                filename,
                saveAs: false
            });

            console.log('PDF download started:', filename);
            return filename;

        } finally {
            // 7. Cleanup: detach debugger
            await debuggerService.detach();
        }

    } finally {
        // 8. Cleanup: close reader tab and clear storage
        if (readerTabId) {
            try {
                await chrome.tabs.remove(readerTabId);
            } catch (e) {
                console.warn('Could not close reader tab:', e);
            }
        }
        await chrome.storage.local.remove('currentArticle');
    }
}
