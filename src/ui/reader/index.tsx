import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import DOMPurify from 'dompurify';
import '../styles/global.css';
import type { Article } from '../../core/types';

export function Reader() {
    const [article, setArticle] = useState<Article | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>('document.pdf');
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        // 1. Check storage immediately
        chrome.storage.local.get('currentArticle', (result) => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError.message);
                return;
            }
            if (result.currentArticle) {
                setArticle(result.currentArticle as Article);
                chrome.runtime.sendMessage({ type: 'READER_READY' });
            }
        });

        interface ReaderMessage {
            type: string;
            payload?: {
                dataBase64?: string;
                filename?: string;
            } | Article;
        }

        // 2. Listen for messages
        const listener = async (message: ReaderMessage) => {
            if (message.type === 'RENDER_ARTICLE' && message.payload) {
                setArticle(message.payload as Article);
                chrome.runtime.sendMessage({ type: 'READER_READY' });
            }

            if (message.type === 'DOWNLOAD_PDF' && message.payload) {
                setStatus('Processing PDF...');
                const payload = message.payload as { dataBase64: string; filename: string };
                const { dataBase64, filename: fName } = payload;
                try {
                    // Manual Base64 → Uint8Array conversion avoids data-URL size limits
                    const binaryString = atob(dataBase64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    setDownloadUrl(url);
                    setFilename(fName);
                    setStatus('Downloading...');

                    // Auto-trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fName;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => document.body.removeChild(a), 100);
                    setStatus('Download started.');

                } catch (e) {
                    console.error('Download preparation failed:', e);
                    setStatus('Error preparing PDF.');
                    alert('Failed to prepare PDF download. Please try the Print button.');
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        chrome.runtime.sendMessage({ type: 'READER_OPENED' });

        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    // Cleanup blob URLs to prevent memory leaks (C-002 fix)
    useEffect(() => {
        return () => {
            if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
            }
        };
    }, [downloadUrl]);

    if (!article) {
        return <div className="p-8 text-center">Loading content...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto p-8 bg-white text-gray-900 print:p-0 relative">
            <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
                {status && <div className="bg-gray-800 text-white px-3 py-2 rounded shadow">{status}</div>}
                {downloadUrl && (
                    <a
                        href={downloadUrl}
                        download={filename}
                        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        Download PDF
                    </a>
                )}
                <button
                    onClick={() => window.print()}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-300"
                >
                    Print / Save as PDF
                </button>
            </div>

            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
            {article.byline && (
                <p className="text-gray-600 mb-8 italic">By {article.byline}</p>
            )}
            <div
                className="prose prose-lg max-w-none prose-img:rounded-xl prose-img:shadow-lg prose-a:text-blue-600"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(article.content, {
                        ADD_TAGS: ['img', 'figure', 'figcaption'],
                        ADD_ATTR: ['src', 'alt', 'title', 'width', 'height']
                    })
                }}
            />

            {/* Source URL at the bottom for PDF */}
            {article.url && (
                <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
                    <p className="break-all">
                        <span className="font-medium">Source: </span>
                        <a href={article.url} className="text-blue-600 hover:underline">{article.url}</a>
                    </p>
                </div>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Reader />
    </React.StrictMode>,
);
