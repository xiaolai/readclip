import { extractForSidePanel, generatePDFFromSidePanel } from './workflows/ExtractForSidePanel';

console.log('Background service worker started.');

// Setup context menu and side panel behavior
chrome.runtime.onInstalled.addListener(() => {
    // Enable side panel to open when toolbar icon is clicked
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // Keep context menu for backward compatibility
    chrome.contextMenus.create({
        id: 'save-as-pdf',
        title: 'Save as PDF',
        contexts: ['page', 'selection'],
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-as-pdf' && tab?.id) {
        console.log('Context menu clicked, opening side panel', info, tab);
        // Open side panel (same as toolbar icon click)
        await chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Listen for messages from side panel and reader
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Side panel: extract article from tab
    if (message.type === 'EXTRACT_FOR_SIDEPANEL') {
        extractForSidePanel(message.payload.tabId)
            .then(article => sendResponse({ success: true, data: article }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response
    }

    // Side panel: generate PDF from article
    if (message.type === 'GENERATE_PDF_FROM_SIDEPANEL') {
        generatePDFFromSidePanel(message.payload.article)
            .then(filename => sendResponse({ success: true, data: filename }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response
    }

    // Reader tab: opened and requesting article data
    if (message.type === 'READER_OPENED') {
        // The reader tab has opened. It should now check storage.
        // We can also actively send it if we want, but storage is easier.
        chrome.storage.local.get('currentArticle', (result) => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError.message);
                return;
            }
            if (result.currentArticle && sender.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'RENDER_ARTICLE',
                    payload: result.currentArticle
                });
            }
        });
    }
});
