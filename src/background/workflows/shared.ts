import type { Article } from '../../core/types';

/**
 * Shared workflow message listener type
 */
export interface WorkflowMessage {
    type: string;
    payload?: unknown;
}

/**
 * Wait for a specific message from a tab with timeout.
 * Returns a promise that resolves when the message is received or rejects on timeout.
 */
export function waitForMessage<T = unknown>(
    type: string,
    senderTabId: number,
    timeoutMs = 10000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const listener = (message: WorkflowMessage, sender: chrome.runtime.MessageSender) => {
            if (message.type === type && sender.tab?.id === senderTabId) {
                chrome.runtime.onMessage.removeListener(listener);
                resolve(message.payload as T);
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
 * Sanitize a string for use in filenames.
 * Supports Latin, CJK (Chinese, Japanese, Korean) characters.
 */
export function sanitizeFilename(str: string, maxLen = 80): string {
    return str
        .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, maxLen);
}

/**
 * Generate a PDF filename from article metadata.
 * Format: title_sitename_datetime.pdf
 */
export function generatePDFFilename(article: Article): string {
    const title = article.title ? sanitizeFilename(article.title) : '';
    const siteName = article.siteName ? sanitizeFilename(article.siteName, 30) : '';
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const parts = [title, siteName, timestamp].filter(Boolean);
    return `${parts.join('_')}.pdf`;
}
