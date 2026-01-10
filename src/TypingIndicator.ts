/**
 * Honeydrop Typing Indicator Utility
 * Handle "user is typing" indicators with automatic debouncing
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export interface TypingIndicatorOptions {
    /** Event to emit when user starts typing (default: 'typing:start') */
    startEvent?: string;
    /** Event to emit when user stops typing (default: 'typing:stop') */
    stopEvent?: string;
    /** Event to listen for other users typing (default: 'typing:start') */
    receiveStartEvent?: string;
    /** Event to listen for other users stopped typing (default: 'typing:stop') */
    receiveStopEvent?: string;
    /** Debounce delay in ms before sending start event (default: 100) */
    debounceDelay?: number;
    /** Timeout in ms after last keystroke to auto-send stop (default: 3000) */
    stopTimeout?: number;
    /** Additional data to send with typing events */
    metadata?: Record<string, unknown>;
}

export interface TypingUser {
    userId: string;
    startedAt: number;
}

const DEFAULT_OPTIONS: Required<Omit<TypingIndicatorOptions, 'metadata'>> = {
    startEvent: 'typing:start',
    stopEvent: 'typing:stop',
    receiveStartEvent: 'typing:start',
    receiveStopEvent: 'typing:stop',
    debounceDelay: 100,
    stopTimeout: 3000
};

export class TypingIndicator {
    private socket: Socket | null = null;
    private options: TypingIndicatorOptions;
    private logger: Logger;
    private isTyping: boolean = false;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private stopTimer: ReturnType<typeof setTimeout> | null = null;
    private typingUsers: Map<string, TypingUser> = new Map();
    private onTypingCallbacks: ((userId: string, data?: unknown) => void)[] = [];
    private onStoppedCallbacks: ((userId: string, data?: unknown) => void)[] = [];

    constructor(options: TypingIndicatorOptions = {}, logger: Logger) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.logger = logger;
    }

    /**
     * Set the socket instance
     */
    setSocket(socket: Socket): void {
        this.socket = socket;

        const startEvent = this.options.receiveStartEvent ?? DEFAULT_OPTIONS.receiveStartEvent;
        const stopEvent = this.options.receiveStopEvent ?? DEFAULT_OPTIONS.receiveStopEvent;

        // Listen for other users typing
        socket.on(startEvent, (data: { userId: string;[key: string]: unknown }) => {
            if (data?.userId) {
                this.typingUsers.set(data.userId, {
                    userId: data.userId,
                    startedAt: Date.now()
                });
                this.onTypingCallbacks.forEach(cb => cb(data.userId, data));
                this.logger.debug(`User ${data.userId} started typing`);
            }
        });

        socket.on(stopEvent, (data: { userId: string;[key: string]: unknown }) => {
            if (data?.userId) {
                this.typingUsers.delete(data.userId);
                this.onStoppedCallbacks.forEach(cb => cb(data.userId, data));
                this.logger.debug(`User ${data.userId} stopped typing`);
            }
        });

        // Clear typing users on disconnect
        socket.on('disconnect', () => {
            this.typingUsers.clear();
            this.reset();
        });
    }

    /**
     * Call this when user types (e.g., on input keydown)
     * Automatically debounces and handles start/stop events
     */
    send(): void {
        if (!this.socket?.connected) return;

        // Clear existing stop timer
        if (this.stopTimer) {
            clearTimeout(this.stopTimer);
        }

        // Set new stop timer
        this.stopTimer = setTimeout(() => {
            this.sendStop();
        }, this.options.stopTimeout ?? DEFAULT_OPTIONS.stopTimeout);

        // If already typing, don't send again
        if (this.isTyping) return;

        // Debounce the start event
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.sendStart();
        }, this.options.debounceDelay ?? DEFAULT_OPTIONS.debounceDelay);
    }

    /**
     * Manually send start typing event
     */
    sendStart(): void {
        if (!this.socket?.connected || this.isTyping) return;

        const event = this.options.startEvent ?? DEFAULT_OPTIONS.startEvent;
        this.socket.emit(event, this.options.metadata ?? {});
        this.isTyping = true;
        this.logger.debug('Sent typing start');
    }

    /**
     * Manually send stop typing event
     */
    sendStop(): void {
        if (!this.socket?.connected || !this.isTyping) return;

        const event = this.options.stopEvent ?? DEFAULT_OPTIONS.stopEvent;
        this.socket.emit(event, this.options.metadata ?? {});
        this.isTyping = false;
        this.logger.debug('Sent typing stop');
    }

    /**
     * Register callback for when a user starts typing
     */
    onUserTyping(callback: (userId: string, data?: unknown) => void): () => void {
        this.onTypingCallbacks.push(callback);
        return () => {
            const index = this.onTypingCallbacks.indexOf(callback);
            if (index !== -1) this.onTypingCallbacks.splice(index, 1);
        };
    }

    /**
     * Register callback for when a user stops typing
     */
    onUserStopped(callback: (userId: string, data?: unknown) => void): () => void {
        this.onStoppedCallbacks.push(callback);
        return () => {
            const index = this.onStoppedCallbacks.indexOf(callback);
            if (index !== -1) this.onStoppedCallbacks.splice(index, 1);
        };
    }

    /**
     * Get list of users currently typing
     */
    getTypingUsers(): string[] {
        return Array.from(this.typingUsers.keys());
    }

    /**
     * Check if a specific user is typing
     */
    isUserTyping(userId: string): boolean {
        return this.typingUsers.has(userId);
    }

    /**
     * Reset typing state and timers
     */
    reset(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.stopTimer) {
            clearTimeout(this.stopTimer);
            this.stopTimer = null;
        }
        this.isTyping = false;
    }

    /**
     * Clean up and stop tracking
     */
    destroy(): void {
        this.reset();
        this.typingUsers.clear();
        this.onTypingCallbacks = [];
        this.onStoppedCallbacks = [];
    }
}
