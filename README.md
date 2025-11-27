# ReadClip

A Chrome extension that clips articles for clean, distraction-free reading and saves them as PDF.

## Features

- **Article Extraction** - Intelligently extracts article content using Mozilla's Readability algorithm
- **Side Panel Reader** - Clean, distraction-free reading experience in Chrome's side panel
- **PDF Export** - One-click save to PDF with proper formatting and source URL attribution
- **Context Menu** - Right-click "Save as PDF" for quick access
- **International Support** - Handles Latin, CJK (Chinese, Japanese, Korean) characters

## Installation

### Development

```bash
npm install
npm run dev
```

Load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` folder

### Production Build

```bash
npm run build
```

## Usage

1. Navigate to any article page
2. Click the ReadClip icon in the toolbar - the side panel opens with extracted content
3. Click "Save PDF" to download the article as a PDF file

Alternative: Right-click on any page → "Save as PDF"

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Content Processing**: Mozilla Readability, DOMPurify
- **Build**: Vite, CRXJS Vite Plugin
- **Testing**: Vitest

## Project Structure

```
src/
├── background/         # Service worker & workflows
├── content/            # Content script for page extraction
├── core/               # Core logic & types
│   └── extraction/     # ContentExtractor
├── services/chrome/    # Chrome API abstractions
└── ui/
    ├── popup/          # Toolbar popup
    ├── sidepanel/      # Main reader UI
    └── reader/         # Hidden tab for PDF generation
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## How It Works

1. **Extraction**: Content script clones the page DOM, resolves relative URLs, and runs Readability
2. **Display**: Extracted article is sanitized with DOMPurify and displayed in the side panel
3. **PDF Generation**: Uses Chrome's Debugger API (`Page.printToPDF`) via a hidden reader tab

## Permissions

- `activeTab` - Access current tab
- `scripting` - Inject content scripts
- `sidePanel` - Side panel UI
- `debugger` - PDF generation
- `downloads` - Save PDF files
- `storage` - Temporary article storage

## License

MIT
