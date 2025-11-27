export interface Article {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string | null;
    url?: string; // Source URL of the article
}

export interface PDFOptions {
    includeImages: boolean;
    includeLinks: boolean;
    paperSize: 'A4' | 'Letter';
}
