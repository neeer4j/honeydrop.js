/**
 * Honeydrop Configuration Loader
 * Loads configuration from honeydrop.config.js in project root
 */

import { HoneydropOptions } from './Honeydrop';

export interface HoneydropConfig extends HoneydropOptions {
    /** Default server URL */
    url?: string;
}

// Config file names to search for (in order of priority)
const CONFIG_FILE_NAMES = [
    'honeydrop.config.js',
    'honeydrop.config.mjs',
    'honeydrop.config.cjs',
    '.honeydroprc.js'
];

/**
 * Attempt to load configuration from project root
 * Works in Node.js environment only
 */
export async function loadConfig(): Promise<HoneydropConfig | null> {
    // Only attempt in Node.js environment
    if (typeof window !== 'undefined') {
        return null;
    }

    try {
        // Dynamic import for Node.js modules
        const path = await import('path');
        const fs = await import('fs');

        // Try to find config file
        const cwd = process.cwd();

        for (const fileName of CONFIG_FILE_NAMES) {
            const configPath = path.join(cwd, fileName);

            if (fs.existsSync(configPath)) {
                try {
                    // Use dynamic import for ES modules support
                    const configModule = await import(/* webpackIgnore: true */ `file://${configPath}`);
                    const config = configModule.default || configModule;

                    console.log(`[Honeydrop] Loaded config from ${fileName}`);
                    return config as HoneydropConfig;
                } catch (importError) {
                    // Try require for CommonJS
                    try {
                        const config = require(configPath);
                        console.log(`[Honeydrop] Loaded config from ${fileName}`);
                        return config.default || config;
                    } catch {
                        console.warn(`[Honeydrop] Failed to load config from ${fileName}`);
                    }
                }
            }
        }
    } catch {
        // Not in Node.js or modules not available
        return null;
    }

    return null;
}

/**
 * Generate a sample config file content
 */
export function generateConfigTemplate(): string {
    return `/**
 * Honeydrop Configuration
 * @type {import('honeydrop').HoneydropConfig}
 */
module.exports = {
    // Default server URL (optional, can be overridden in constructor)
    // url: 'http://localhost:3000',

    // Enable debug logging
    debug: false,

    // Log level: 'debug' | 'info' | 'warn' | 'error'
    logLevel: 'info',

    // Auto-connect on instantiation
    autoConnect: true,

    // Reconnection settings
    reconnection: {
        enabled: true,
        maxAttempts: 10,
        delay: 1000,
        maxDelay: 30000,
        strategy: 'exponential' // 'linear' | 'exponential'
    },

    // Offline queue settings
    offlineQueue: {
        enabled: true,
        maxSize: 100,
        maxAge: 0 // 0 = no expiry
    },

    // Connection monitor settings
    connectionMonitor: {
        enabled: true,
        pingInterval: 5000,
        pingTimeout: 3000
    },

    // Room manager settings
    roomManager: {
        joinEvent: 'join',
        leaveEvent: 'leave'
    },

    // Namespace delimiter
    namespaceDelimiter: ':',

    // Socket.IO client options
    socketOptions: {
        // transports: ['websocket', 'polling'],
        // auth: { token: 'your-token' }
    }
};
`;
}

/**
 * Check if a config file exists in the project
 */
export async function configExists(): Promise<boolean> {
    if (typeof window !== 'undefined') return false;

    try {
        const path = await import('path');
        const fs = await import('fs');
        const cwd = process.cwd();

        return CONFIG_FILE_NAMES.some(fileName =>
            fs.existsSync(path.join(cwd, fileName))
        );
    } catch {
        return false;
    }
}
