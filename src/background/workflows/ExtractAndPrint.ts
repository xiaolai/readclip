import { DebuggerService } from '../../services/chrome/debugger';
import { sendMessage } from '../../services/chrome/messaging';
import type { Article } from '../../core/types';

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

import contentScriptPath from '../../content/index.ts?script';

async function injectContentScript(tabId: number) {
    await chrome.scripting.executeScript({
        target: { tabId },
        files: [contentScriptPath]
    });
}

export async function extractAndPrint(sourceTabId: number) {
    console.log('Starting extraction for tab:', sourceTabId);
    let readerTabId: number | undefined;

    try {
        // 0. Inject Content Script (since we removed it from manifest)
        await injectContentScript(sourceTabId);

        // 1. Extract Content
        const response = await sendMessage<{ success: boolean; data?: Article; error?: string }>(
            sourceTabId,
            { type: 'EXTRACT_CONTENT' }
        );

        if (!response || !response.success || !response.data) {
            throw new Error(response?.error || 'Failed to extract content');
        }

        const article = response.data;
        console.log('Extracted article:', article.title);

        // 2. Save to storage for the Reader to pick up
        await chrome.storage.local.set({ currentArticle: article });

        // 3. Open Reader Tab
        const readerTab = await chrome.tabs.create({
            url: chrome.runtime.getURL('src/ui/reader/index.html'),
            active: true
        });

        readerTabId = readerTab.id;
        if (!readerTabId) {
            throw new Error('Failed to create reader tab');
        }

        // 4. Wait for Reader to be ready
        console.log('Waiting for reader to be ready...');
        await waitForMessage('READER_READY', readerTabId);

        // 5. Attach Debugger & Print
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

            // 6. Send PDF data to Reader View for download
            // This avoids background script Data URL limitations
            console.log('PDF generated, sending to Reader View for download...');

            // Sanitize filename: title_sitename_datetime.pdf
            const sanitize = (str: string, maxLen = 80) => str.replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, maxLen);
            const title = article.title ? sanitize(article.title) : '';
            const siteName = article.siteName ? sanitize(article.siteName, 30) : '';
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const parts = [title, siteName, timestamp].filter(Boolean);
            const filename = `${parts.join('_')}.pdf`;

            // Primary path: trigger download via downloads API to avoid any content-page blockers
            try {
                const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
                const downloadId = await chrome.downloads.download({
                    url: dataUrl,
                    filename,
                    saveAs: false
                });
                console.log('Download started via downloads API, id:', downloadId);
            } catch (downloadError) {
                console.warn('downloads.download failed, will fall back to Reader View button:', downloadError);
            }

            // Always send to Reader View so user can retry / print manually
            await chrome.tabs.sendMessage(readerTabId, {
                type: 'DOWNLOAD_PDF',
                payload: {
                    dataBase64: pdfBase64,
                    filename: filename
                }
            });

            console.log('Download request sent to Reader View.');

        } finally {
            // 7. Always detach debugger
            await debuggerService.detach();

            // 8. Cleanup storage
            await chrome.storage.local.remove('currentArticle');
        }

    } catch (error) {
        console.error('Workflow failed:', error);

        // User-visible error
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'src/assets/react.svg', // Fallback icon
            title: 'Save as PDF Failed',
            message: (error as Error).message || 'An unexpected error occurred.'
        });
    }
}
