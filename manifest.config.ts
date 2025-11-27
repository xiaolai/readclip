import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'

const { version } = packageJson

// Convert major.minor.patch to major.minor.patch.build if needed, 
// but for now just use the version string.
const [major, minor, patch] = version.split(/[.-]/)

export default defineManifest(async (env) => ({
    manifest_version: 3,
    name: env.mode === 'staging' ? '[DEV] Reader Mode' : 'Reader Mode',
    description: 'Extract and read articles in a clean reader view. Save as PDF.',
    version: `${major}.${minor}.${patch}`,
    version_name: version,
    action: {
        // No default_popup - icon click triggers side panel via setPanelBehavior()
    },
    side_panel: {
        default_path: 'src/ui/sidepanel/index.html'
    },
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    permissions: [
        'activeTab',
        'contextMenus',
        'storage',
        'scripting',
        'debugger', // For Page.printToPDF
        'downloads', // To save the PDF
        'notifications', // For error feedback
        'sidePanel' // For reader view sidebar
    ],
    host_permissions: ['<all_urls>'], // Required for content script injection
    web_accessible_resources: [
        {
            resources: ['src/ui/styles/global.css'], // If we want to inject styles
            matches: ['<all_urls>'],
        }
    ],
}))
