/**
 * Honeydrop Offline Queue
 * Stores events when disconnected and flushes them on reconnect
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export interface QueuedEvent {
    event: string;
    args: unknown[];
    timestamp: number;
}

export interface OfflineQueueOptions {
    /** Enable offline queueing (default: true) */
    enabled?: boolean;
    /** Maximum number of events to queue (default: 100, 0 = unlimited) */
    maxSize?: number;
    /** Maximum age of events in ms before they're discarded (default: 0 = no expiry) */
    maxAge?: number;
    /** Called when an event is queued */
    onQueued?: (event: QueuedEvent) => void;
    /** Called when events are flushed */
    onFlushed?: (count: number) => void;
    /** Called when queue is full and event is dropped */
    onDropped?: (event: QueuedEvent) => void;
}

const DEFAULT_OPTIONS: Required<Pick<OfflineQueueOptions, 'enabled' | 'maxSize' | 'maxAge'>> = {
    enabled: true,
    maxSize: 100,
    maxAge: 0
};

export class OfflineQueue {
    private queue: QueuedEvent[] = [];
    private options: OfflineQueueOptions;
    private logger: Logger;
    private socket: Socket | null = null;

    constructor(options: OfflineQueueOptions = {}, logger: Logger) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.logger = logger;
    }

    /**
     * Set the socket instance
     */
    setSocket(socket: Socket): void {
        this.socket = socket;

        // Listen for connect events to flush queue
        socket.on('connect', () => {
            this.flush();
        });
    }

    /**
     * Add an event to the queue
     * Returns true if queued, false if dropped
     */
    enqueue(event: string, ...args: unknown[]): boolean {
        if (!this.options.enabled) {
            return false;
        }

        const queuedEvent: QueuedEvent = {
            event,
            args,
            timestamp: Date.now()
        };

        // Check if queue is full
        if (this.options.maxSize && this.options.maxSize > 0 && this.queue.length >= this.options.maxSize) {
            this.logger.warn(`Offline queue full. Dropping event: ${event}`);
            this.options.onDropped?.(queuedEvent);
            return false;
        }

        this.queue.push(queuedEvent);
        this.logger.debug(`Event queued offline: ${event} (queue size: ${this.queue.length})`);
        this.options.onQueued?.(queuedEvent);
        return true;
    }

    /**
     * Flush all queued events to the socket
     */
    flush(): void {
        if (!this.socket?.connected || this.queue.length === 0) {
            return;
        }

        // Remove expired events if maxAge is set
        if (this.options.maxAge && this.options.maxAge > 0) {
            const now = Date.now();
            const originalLength = this.queue.length;
            this.queue = this.queue.filter(e => (now - e.timestamp) < this.options.maxAge!);
            const expired = originalLength - this.queue.length;
            if (expired > 0) {
                this.logger.debug(`Discarded ${expired} expired events from queue`);
            }
        }

        const count = this.queue.length;
        if (count === 0) return;

        this.logger.info(`Flushing ${count} queued events...`);

        // Send all queued events
        while (this.queue.length > 0) {
            const queuedEvent = this.queue.shift()!;
            this.socket.emit(queuedEvent.event, ...queuedEvent.args);
            this.logger.debug(`Flushed: ${queuedEvent.event}`);
        }

        this.options.onFlushed?.(count);
        this.logger.info(`Successfully flushed ${count} events`);
    }

    /**
     * Get current queue length
     */
    get length(): number {
        return this.queue.length;
    }

    /**
     * Get all queued events (read-only copy)
     */
    getQueue(): readonly QueuedEvent[] {
        return [...this.queue];
    }

    /**
     * Clear all queued events
     */
    clear(): void {
        const count = this.queue.length;
        this.queue = [];
        this.logger.debug(`Cleared ${count} events from offline queue`);
    }

    /**
     * Check if queueing is enabled
     */
    get enabled(): boolean {
        return this.options.enabled ?? true;
    }

    /**
     * Enable or disable queueing
     */
    setEnabled(enabled: boolean): void {
        this.options.enabled = enabled;
    }
}
