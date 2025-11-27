export class DebuggerService {
    private target: chrome.debugger.Debuggee;

    constructor(tabId: number) {
        this.target = { tabId };
    }

    public async attach(): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.debugger.attach(this.target, '1.3', () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    public async detach(): Promise<void> {
        return new Promise((resolve) => {
            chrome.debugger.detach(this.target, () => {
                // Ignore errors on detach
                resolve();
            });
        });
    }

    public async printToPDF(options: Record<string, unknown> = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(this.target, 'Page.printToPDF', options, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    // result.data is the base64 encoded PDF
                    resolve((result as any).data);
                }
            });
        });
    }
}
