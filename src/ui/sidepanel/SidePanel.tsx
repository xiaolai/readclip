import { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import type { Article } from '../../core/types';

type Status = 'idle' | 'extracting' | 'ready' | 'generating-pdf' | 'error';

interface State {
    status: Status;
    article: Article | null;
    error: string | null;
    activeTabId: number | null;
    pdfStatus: string;
}

export function SidePanel() {
    const [state, setState] = useState<State>({
        status: 'idle',
        article: null,
        error: null,
        activeTabId: null,
        pdfStatus: '',
    });

    const extractFromTab = useCallback(async () => {
        setState(prev => ({ ...prev, status: 'extracting', error: null }));

        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab.id) {
                throw new Error('No active tab found');
            }

            // Request extraction from background
            const response = await chrome.runtime.sendMessage({
                type: 'EXTRACT_FOR_SIDEPANEL',
                payload: { tabId: tab.id }
            });

            if (response.success && response.data) {
                setState({
                    status: 'ready',
                    article: response.data,
                    error: null,
                    activeTabId: tab.id,
                    pdfStatus: '',
                });
            } else {
                throw new Error(response.error || 'Failed to extract content');
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: (error as Error).message,
            }));
        }
    }, []);

    const handleGeneratePDF = useCallback(async () => {
        if (!state.article) return;

        setState(prev => ({ ...prev, status: 'generating-pdf', pdfStatus: 'Generating PDF...' }));

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GENERATE_PDF_FROM_SIDEPANEL',
                payload: { article: state.article }
            });

            if (response.success) {
                setState(prev => ({
                    ...prev,
                    status: 'ready',
                    pdfStatus: `Downloaded: ${response.data}`,
                }));
                // Clear status after a few seconds
                setTimeout(() => {
                    setState(prev => ({ ...prev, pdfStatus: '' }));
                }, 3000);
            } else {
                throw new Error(response.error || 'PDF generation failed');
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'ready',
                pdfStatus: `Error: ${(error as Error).message}`,
            }));
        }
    }, [state.article]);

    // Extract on mount
    useEffect(() => {
        extractFromTab();
    }, [extractFromTab]);

    // Re-extract on tab activation (debounced)
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleTabActivated = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                extractFromTab();
            }, 300);
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            clearTimeout(timeoutId);
        };
    }, [extractFromTab]);

    // Loading state
    if (state.status === 'extracting') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Extracting article...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (state.status === 'error') {
        return (
            <div className="min-h-screen bg-white p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold mb-2">Could not extract content</h3>
                    <p className="text-red-600 text-sm mb-4">{state.error}</p>
                    <button
                        onClick={extractFromTab}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                    This page may not contain extractable article content.
                    Try navigating to an article page.
                </p>
            </div>
        );
    }

    // Idle state (should not normally be seen)
    if (!state.article) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">No content loaded</p>
            </div>
        );
    }

    // Ready state - show article
    return (
        <div className="min-h-screen bg-white">
            {/* Header with actions */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={extractFromTab}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>

                    <div className="flex-1 min-w-0">
                        {state.pdfStatus && (
                            <span className="text-sm text-gray-600 truncate block">
                                {state.pdfStatus}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleGeneratePDF}
                        disabled={state.status === 'generating-pdf'}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
                    >
                        {state.status === 'generating-pdf' ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Save PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Article content */}
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-3 leading-tight">{state.article.title}</h1>

                {state.article.byline && (
                    <p className="text-gray-600 mb-4 text-sm italic">By {state.article.byline}</p>
                )}

                {state.article.siteName && (
                    <p className="text-gray-500 mb-4 text-xs">{state.article.siteName}</p>
                )}

                <div
                    className="prose prose-sm max-w-none prose-img:rounded-lg prose-img:shadow-md prose-a:text-blue-600"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(state.article.content, {
                            ADD_TAGS: ['img', 'figure', 'figcaption'],
                            ADD_ATTR: ['src', 'alt', 'title', 'width', 'height']
                        })
                    }}
                />

                {/* Source URL */}
                {state.article.url && (
                    <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
                        <p className="break-all">
                            <span className="font-medium">Source: </span>
                            <a href={state.article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{state.article.url}</a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
