/**
 * Honeydrop Middleware System
 * Intercept and transform events before emit or after receive
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export type MiddlewareType = 'emit' | 'receive';

export type MiddlewareFunction = (
    event: string,
    data: unknown,
    next: () => void,
    abort: () => void
) => void | Promise<void>;

export interface MiddlewareEntry {
    type: MiddlewareType;
    fn: MiddlewareFunction;
    /** Optional: only apply to specific events (glob patterns supported) */
    events?: string[];
}

export interface MiddlewareOptions {
    /** Enable middleware (default: true) */
    enabled?: boolean;
}

const DEFAULT_OPTIONS: Required<MiddlewareOptions> = {
    enabled: true
};

export class Middleware {
    private middlewares: MiddlewareEntry[] = [];
    private options: Required<MiddlewareOptions>;
    private logger: Logger;

    constructor(options: MiddlewareOptions = {}, logger: Logger) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.logger = logger;
    }

    /**
     * Add a middleware function
     * @param type - 'emit' for outgoing, 'receive' for incoming events
     * @param fn - Middleware function
     * @param events - Optional array of event names to filter (supports wildcards)
     */
    use(type: MiddlewareType, fn: MiddlewareFunction, events?: string[]): () => void {
        const entry: MiddlewareEntry = { type, fn, events };
        this.middlewares.push(entry);
        this.logger.debug(`Middleware added for ${type} events`);

        // Return unsubscribe function
        return () => {
            const index = this.middlewares.indexOf(entry);
            if (index !== -1) {
                this.middlewares.splice(index, 1);
                this.logger.debug(`Middleware removed for ${type} events`);
            }
        };
    }

    /**
     * Check if event matches filter patterns
     */
    private matchesEvent(event: string, patterns?: string[]): boolean {
        if (!patterns || patterns.length === 0) return true;

        return patterns.some(pattern => {
            if (pattern === '*') return true;
            if (pattern.endsWith('*')) {
                return event.startsWith(pattern.slice(0, -1));
            }
            return event === pattern;
        });
    }

    /**
     * Execute middleware chain for emit events
     * Returns true if event should proceed, false if aborted
     */
    async executeEmit(event: string, data: unknown): Promise<boolean> {
        if (!this.options.enabled) return true;

        const emitMiddlewares = this.middlewares.filter(
            m => m.type === 'emit' && this.matchesEvent(event, m.events)
        );

        if (emitMiddlewares.length === 0) return true;

        return this.executeChain(emitMiddlewares, event, data);
    }

    /**
     * Execute middleware chain for receive events
     * Returns true if event should proceed, false if aborted
     */
    async executeReceive(event: string, data: unknown): Promise<boolean> {
        if (!this.options.enabled) return true;

        const receiveMiddlewares = this.middlewares.filter(
            m => m.type === 'receive' && this.matchesEvent(event, m.events)
        );

        if (receiveMiddlewares.length === 0) return true;

        return this.executeChain(receiveMiddlewares, event, data);
    }

    /**
     * Execute a chain of middleware functions
     */
    private async executeChain(
        chain: MiddlewareEntry[],
        event: string,
        data: unknown
    ): Promise<boolean> {
        let index = 0;
        let aborted = false;

        const runNext = async (): Promise<void> => {
            if (aborted || index >= chain.length) return;

            const current = chain[index++];

            return new Promise<void>((resolve) => {
                const next = () => {
                    resolve();
                };
                const abort = () => {
                    aborted = true;
                    this.logger.debug(`Middleware aborted event: ${event}`);
                    resolve();
                };

                try {
                    const result = current.fn(event, data, next, abort);
                    if (result instanceof Promise) {
                        result.catch(err => {
                            this.logger.error(`Middleware error: ${err.message}`);
                            next(); // Continue on error by default
                        });
                    }
                } catch (err) {
                    this.logger.error(`Middleware error: ${(err as Error).message}`);
                    next(); // Continue on error by default
                }
            }).then(() => runNext());
        };

        await runNext();
        return !aborted;
    }

    /**
     * Get count of registered middlewares
     */
    get count(): number {
        return this.middlewares.length;
    }

    /**
     * Clear all middlewares
     */
    clear(): void {
        this.middlewares = [];
        this.logger.debug('All middlewares cleared');
    }

    /**
     * Enable or disable middleware processing
     */
    setEnabled(enabled: boolean): void {
        this.options.enabled = enabled;
    }
}
