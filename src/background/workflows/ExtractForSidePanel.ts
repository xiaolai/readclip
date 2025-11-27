import { DebuggerService } from '../../services/chrome/debugger';
import { sendMessage } from '../../services/chrome/messaging';
import type { Article } from '../../core/types';
import { waitForMessage, generatePDFFilename } from './shared';

import contentScriptPath from '../../content/index.ts?script';

interface ExtractContentResponse {
    success: boolean;
    data?: Article;
    error?: string;
}

async function injectContentScript(tabId: number): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [contentScriptPath]
        });
    } catch (error) {
        const errorMessage = (error as Error).message || '';
        // Throw error for restricted pages
        if (errorMessage.includes('Cannot access a chrome://') ||
            errorMessage.includes('Cannot access a chrome-extension://')) {
            throw new Error('Cannot extract content from this page type');
        }
        // For other errors (e.g., script already injected), continue silently
    }
}

/**
 * Extract article from a tab without generating PDF.
 * Used by the side panel to display reader view.
 */
export async function extractForSidePanel(tabId: number): Promise<Article> {
    // 1. Inject content script if needed
    await injectContentScript(tabId);

    // 2. Extract content
    const response = await sendMessage<ExtractContentResponse>(
        tabId,
        { type: 'EXTRACT_CONTENT' }
    );

    if (!response || !response.success || !response.data) {
        throw new Error(response?.error || 'Failed to extract content');
    }

    return response.data;
}

/**
 * Generate PDF from article data provided by the side panel.
 * Uses a hidden reader tab for PDF generation.
 */
export async function generatePDFFromSidePanel(article: Article): Promise<string> {
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
        await waitForMessage('READER_READY', readerTabId);

        // 4. Attach debugger and generate PDF
        const debuggerService = new DebuggerService(readerTabId);
        await debuggerService.attach();

        const pdfBase64 = await debuggerService.printToPDF({
            printBackground: true,
            marginTop: 0,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
        });

        // 5. Generate filename and download
        const filename = generatePDFFilename(article);
        const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
        await chrome.downloads.download({
            url: dataUrl,
            filename,
            saveAs: false
        });

        // 6. Cleanup debugger before closing tab
        await debuggerService.detach();

        return filename;

    } finally {
        // Cleanup: close reader tab first, then clear storage
        // Only clear storage if tab was successfully closed
        if (readerTabId) {
            try {
                // Check if tab still exists before trying to close
                const tab = await chrome.tabs.get(readerTabId).catch(() => null);
                if (tab) {
                    await chrome.tabs.remove(readerTabId);
                }
                // Only clear storage after successful tab cleanup
                await chrome.storage.local.remove('currentArticle');
            } catch {
                // Tab cleanup failed - don't clear storage to avoid confusing state
                console.error('Failed to cleanup reader tab, storage not cleared');
            }
        } else {
            // No tab was created, safe to clear storage
            await chrome.storage.local.remove('currentArticle');
        }
    }
}
