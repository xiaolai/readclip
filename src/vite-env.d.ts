/// <reference types="vite/client" />

declare module '*?script' {
    const scriptPath: string;
    export default scriptPath;
}
