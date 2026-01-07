/**
 * Honeydrop Event Manager
 * Tracks and manages event listeners with auto-cleanup capabilities
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

interface EventListener {
    event: string;
    handler: (...args: unknown[]) => void;
    once: boolean;
}

export class EventManager {
    private listeners: Map<string, EventListener[]> = new Map();
    private socket: Socket | null = null;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Set the socket instance to manage
     */
    setSocket(socket: Socket): void {
        this.socket = socket;
    }

    /**
     * Register an event listener
     */
    on(event: string, handler: (...args: unknown[]) => void): void {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        const wrappedHandler = (...args: unknown[]) => {
            this.logger.receive(event, args.length === 1 ? args[0] : args);
            handler(...args);
        };

        this.socket.on(event, wrappedHandler);
        this.addListener(event, wrappedHandler, false);
    }

    /**
     * Register a one-time event listener
     */
    once(event: string, handler: (...args: unknown[]) => void): void {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        const wrappedHandler = (...args: unknown[]) => {
            this.logger.receive(event, args.length === 1 ? args[0] : args);
            this.removeListener(event, wrappedHandler);
            handler(...args);
        };

        this.socket.once(event, wrappedHandler);
        this.addListener(event, wrappedHandler, true);
    }

    /**
     * Remove a specific event listener or all listeners for an event
     */
    off(event: string, handler?: (...args: unknown[]) => void): void {
        if (!this.socket) return;

        if (handler) {
            this.socket.off(event, handler);
            this.removeListener(event, handler);
        } else {
            // Remove all listeners for this event
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.forEach(listener => {
                    this.socket?.off(event, listener.handler);
                });
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Register handlers for multiple events at once
     */
    onMultiple(events: string[], handler: (event: string, ...args: unknown[]) => void): void {
        events.forEach(event => {
            this.on(event, (...args) => handler(event, ...args));
        });
    }

    /**
     * Register a handler that fires once when any of the specified events occur
     */
    onceAny(events: string[], handler: (event: string, ...args: unknown[]) => void): void {
        let fired = false;
        const cleanup = () => {
            if (fired) return;
            fired = true;
            events.forEach(event => this.off(event));
        };

        events.forEach(event => {
            this.on(event, (...args) => {
                if (!fired) {
                    cleanup();
                    handler(event, ...args);
                }
            });
        });
    }

    /**
     * Get the count of listeners for an event
     */
    listenerCount(event: string): number {
        return this.listeners.get(event)?.length ?? 0;
    }

    /**
     * Get all registered event names
     */
    eventNames(): string[] {
        return Array.from(this.listeners.keys());
    }

    /**
     * Remove all event listeners (auto-cleanup)
     */
    removeAllListeners(): void {
        if (!this.socket) return;

        this.listeners.forEach((eventListeners, event) => {
            eventListeners.forEach(listener => {
                this.socket?.off(event, listener.handler);
            });
        });

        this.listeners.clear();
        this.logger.debug('All event listeners removed');
    }

    /**
     * Track a listener internally
     */
    private addListener(event: string, handler: (...args: unknown[]) => void, once: boolean): void {
        const eventListeners = this.listeners.get(event) ?? [];
        eventListeners.push({ event, handler, once });
        this.listeners.set(event, eventListeners);
    }

    /**
     * Remove a listener from internal tracking
     */
    private removeListener(event: string, handler: (...args: unknown[]) => void): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.findIndex(l => l.handler === handler);
            if (index !== -1) {
                eventListeners.splice(index, 1);
                if (eventListeners.length === 0) {
                    this.listeners.delete(event);
                }
            }
        }
    }
}
