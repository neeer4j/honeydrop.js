/**
 * Honeydrop Reconnection Handler
 * Manages automatic reconnection with customizable retry strategies
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export type ReconnectionStrategy = 'linear' | 'exponential';

export interface ReconnectionOptions {
    enabled?: boolean;
    maxAttempts?: number;
    delay?: number;
    maxDelay?: number;
    strategy?: ReconnectionStrategy;
    onReconnecting?: (attempt: number) => void;
    onReconnected?: () => void;
    onFailed?: () => void;
}

const DEFAULT_OPTIONS: Required<Omit<ReconnectionOptions, 'onReconnecting' | 'onReconnected' | 'onFailed'>> = {
    enabled: true,
    maxAttempts: 10,
    delay: 1000,
    maxDelay: 30000,
    strategy: 'exponential'
};

export class ReconnectionHandler {
    private options: Required<Omit<ReconnectionOptions, 'onReconnecting' | 'onReconnected' | 'onFailed'>>;
    private callbacks: Pick<ReconnectionOptions, 'onReconnecting' | 'onReconnected' | 'onFailed'>;
    private socket: Socket | null = null;
    private logger: Logger;
    private attempts: number = 0;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private isReconnecting: boolean = false;

    constructor(options: ReconnectionOptions, logger: Logger) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.callbacks = {
            onReconnecting: options.onReconnecting,
            onReconnected: options.onReconnected,
            onFailed: options.onFailed
        };
        this.logger = logger;
    }

    /**
     * Set the socket instance to manage
     */
    setSocket(socket: Socket): void {
        this.socket = socket;
        this.setupListeners();
    }

    /**
     * Calculate the delay for the next reconnection attempt
     */
    private calculateDelay(): number {
        let delay: number;

        if (this.options.strategy === 'exponential') {
            delay = this.options.delay * Math.pow(2, this.attempts - 1);
        } else {
            delay = this.options.delay;
        }

        return Math.min(delay, this.options.maxDelay);
    }

    /**
     * Setup socket event listeners for reconnection
     */
    private setupListeners(): void {
        if (!this.socket) return;

        this.socket.on('disconnect', (reason) => {
            this.logger.connection('disconnected', { reason });

            // Don't auto-reconnect if it was a manual disconnect
            if (reason === 'io client disconnect' || !this.options.enabled) {
                return;
            }

            this.startReconnection();
        });

        this.socket.on('connect', () => {
            if (this.isReconnecting) {
                this.logger.connection('reconnected');
                this.callbacks.onReconnected?.();
                this.reset();
            } else {
                this.logger.connection('connected');
            }
        });

        this.socket.on('connect_error', () => {
            if (this.isReconnecting) {
                this.attemptReconnection();
            }
        });
    }

    /**
     * Start the reconnection process
     */
    private startReconnection(): void {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        this.attempts = 0;
        this.attemptReconnection();
    }

    /**
     * Attempt a single reconnection
     */
    private attemptReconnection(): void {
        if (!this.socket || !this.isReconnecting) return;

        this.attempts++;

        if (this.attempts > this.options.maxAttempts) {
            this.logger.error(`Reconnection failed after ${this.options.maxAttempts} attempts`);
            this.callbacks.onFailed?.();
            this.reset();
            return;
        }

        const delay = this.calculateDelay();
        this.logger.connection('reconnecting', { attempt: this.attempts, delay });
        this.callbacks.onReconnecting?.(this.attempts);

        this.timer = setTimeout(() => {
            if (this.socket && this.isReconnecting) {
                this.socket.connect();
            }
        }, delay);
    }

    /**
     * Manually trigger a reconnection
     */
    reconnect(): void {
        if (!this.socket) {
            throw new Error('Socket not initialized');
        }

        this.reset();
        this.socket.connect();
    }

    /**
     * Reset reconnection state
     */
    private reset(): void {
        this.isReconnecting = false;
        this.attempts = 0;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Stop reconnection attempts
     */
    stop(): void {
        this.reset();
        this.logger.debug('Reconnection handler stopped');
    }

    /**
     * Get current reconnection status
     */
    getStatus(): { isReconnecting: boolean; attempts: number } {
        return {
            isReconnecting: this.isReconnecting,
            attempts: this.attempts
        };
    }

    /**
     * Update reconnection options
     */
    updateOptions(options: Partial<ReconnectionOptions>): void {
        Object.assign(this.options, options);
        if (options.onReconnecting !== undefined) this.callbacks.onReconnecting = options.onReconnecting;
        if (options.onReconnected !== undefined) this.callbacks.onReconnected = options.onReconnected;
        if (options.onFailed !== undefined) this.callbacks.onFailed = options.onFailed;
    }
}
