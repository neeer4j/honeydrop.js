/**
 * Honeydrop Logger
 * Debug and logging utilities for development
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerOptions {
    level?: LogLevel;
    prefix?: string;
    enabled?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
};

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '#9E9E9E',
    info: '#2196F3',
    warn: '#FF9800',
    error: '#F44336',
    none: ''
};

export class Logger {
    private level: LogLevel;
    private prefix: string;
    private enabled: boolean;
    private isBrowser: boolean;

    constructor(options: LoggerOptions = {}) {
        this.level = options.level ?? 'info';
        this.prefix = options.prefix ?? '[Honeydrop]';
        this.enabled = options.enabled ?? false;
        this.isBrowser = typeof window !== 'undefined';
    }

    /**
     * Set the logging level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Enable or disable logging
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if logging is enabled for a specific level
     */
    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
    }

    /**
     * Format the log message
     */
    private formatMessage(level: LogLevel, message: string): string[] {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        if (this.isBrowser) {
            return [
                `%c${this.prefix} %c${level.toUpperCase()} %c[${timestamp}] %c${message}`,
                'color: #FFC107; font-weight: bold',
                `color: ${LOG_COLORS[level]}; font-weight: bold`,
                'color: #9E9E9E',
                'color: inherit'
            ];
        }
        return [`${this.prefix} ${level.toUpperCase()} [${timestamp}] ${message}`];
    }

    /**
     * Log a debug message
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            const formatted = this.formatMessage('debug', message);
            console.debug(...formatted, ...args);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, ...args: unknown[]): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('info', message);
            console.info(...formatted, ...args);
        }
    }

    /**
     * Log a warning message
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            const formatted = this.formatMessage('warn', message);
            console.warn(...formatted, ...args);
        }
    }

    /**
     * Log an error message
     */
    error(message: string, ...args: unknown[]): void {
        if (this.shouldLog('error')) {
            const formatted = this.formatMessage('error', message);
            console.error(...formatted, ...args);
        }
    }

    /**
     * Log a connection event
     */
    connection(event: 'connected' | 'disconnected' | 'reconnecting' | 'reconnected', details?: unknown): void {
        const messages: Record<string, string> = {
            connected: '🟢 Connected to server',
            disconnected: '🔴 Disconnected from server',
            reconnecting: '🟡 Attempting to reconnect...',
            reconnected: '🟢 Reconnected to server'
        };
        this.info(messages[event], details ?? '');
    }

    /**
     * Log an event emission
     */
    emit(event: string, data?: unknown): void {
        this.debug(`📤 Emit: ${event}`, data !== undefined ? data : '');
    }

    /**
     * Log an event reception
     */
    receive(event: string, data?: unknown): void {
        this.debug(`📥 Received: ${event}`, data !== undefined ? data : '');
    }
}

// Default logger instance
export const logger = new Logger();
