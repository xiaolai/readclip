interface PrintToPDFResult {
    data: string;
}

export class DebuggerService {
    private target: chrome.debugger.Debuggee;

    constructor(tabId: number) {
        this.target = { tabId };
    }

    public async attach(): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.debugger.attach(this.target, '1.3', () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    public async detach(): Promise<void> {
        return new Promise((resolve) => {
            chrome.debugger.detach(this.target, () => {
                // Ignore errors on detach - tab may already be closed
                resolve();
            });
        });
    }

    public async printToPDF(options: Record<string, unknown> = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(this.target, 'Page.printToPDF', options, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (result) {
                    resolve((result as PrintToPDFResult).data);
                } else {
                    reject(new Error('No result from printToPDF'));
                }
            });
        });
    }
}
