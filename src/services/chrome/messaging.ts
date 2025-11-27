export type MessageType =
    | 'EXTRACT_CONTENT'
    | 'EXTRACT_CONTENT_SUCCESS'
    | 'EXTRACT_CONTENT_ERROR'
    | 'GENERATE_PDF'
    | 'READER_OPENED'
    | 'READER_READY'
    | 'EXTRACT_FOR_SIDEPANEL'
    | 'GENERATE_PDF_FROM_SIDEPANEL';

export interface Message<T = unknown> {
    type: MessageType;
    payload?: T;
}

export const sendMessage = async <TResponse = unknown>(
    tabId: number,
    message: Message
): Promise<TResponse> => {
    return chrome.tabs.sendMessage(tabId, message);
};

export const sendRuntimeMessage = async <TResponse = unknown>(
    message: Message
): Promise<TResponse> => {
    return chrome.runtime.sendMessage(message);
};
