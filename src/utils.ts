/**
 * Honeydrop Utility Functions
 * Helper functions for common Socket.IO operations
 */

import type { Socket } from 'socket.io-client';

export interface EmitItem {
    event: string;
    data?: unknown;
}

export interface EmitWithAckItem extends EmitItem {
    timeout?: number;
}

/**
 * Emit multiple events at once
 */
export function emitMultiple(socket: Socket, events: EmitItem[]): void {
    events.forEach(({ event, data }) => {
        if (data !== undefined) {
            socket.emit(event, data);
        } else {
            socket.emit(event);
        }
    });
}

/**
 * Emit multiple events with acknowledgment support
 */
export async function emitMultipleWithAck(
    socket: Socket,
    events: EmitWithAckItem[]
): Promise<unknown[]> {
    const promises = events.map(async ({ event, data, timeout = 5000 }) => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for ack: ${event}`));
            }, timeout);

            const args = data !== undefined ? [data] : [];
            socket.emit(event, ...args, (response: unknown) => {
                clearTimeout(timer);
                resolve(response);
            });
        });
    });

    return Promise.all(promises);
}

/**
 * Wait for a specific event with optional timeout
 */
export function waitForEvent(
    socket: Socket,
    event: string,
    timeout: number = 5000
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);

        const handler = (data: unknown) => {
            clearTimeout(timer);
            resolve(data);
        };

        socket.once(event, handler);
    });
}

/**
 * Wait for any of the specified events
 */
export function waitForAnyEvent(
    socket: Socket,
    events: string[],
    timeout: number = 5000
): Promise<{ event: string; data: unknown }> {
    return new Promise((resolve, reject) => {
        const handlers: Map<string, (data: unknown) => void> = new Map();

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for events: ${events.join(', ')}`));
        }, timeout);

        const cleanup = () => {
            handlers.forEach((handler, event) => {
                socket.off(event, handler);
            });
        };

        events.forEach(event => {
            const handler = (data: unknown) => {
                clearTimeout(timer);
                cleanup();
                resolve({ event, data });
            };
            handlers.set(event, handler);
            socket.once(event, handler);
        });
    });
}

/**
 * Create a promise-based emit with acknowledgment
 */
export function emitWithAck(
    socket: Socket,
    event: string,
    data?: unknown,
    timeout: number = 5000
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ack: ${event}`));
        }, timeout);

        const args = data !== undefined ? [data] : [];
        socket.emit(event, ...args, (response: unknown) => {
            clearTimeout(timer);
            resolve(response);
        });
    });
}

/**
 * Check if socket is connected
 */
export function isConnected(socket: Socket | null): boolean {
    return socket?.connected ?? false;
}

/**
 * Get socket connection info
 */
export function getConnectionInfo(socket: Socket | null): {
    connected: boolean;
    id: string | null;
    transport: string | null;
} {
    if (!socket) {
        return { connected: false, id: null, transport: null };
    }

    return {
        connected: socket.connected,
        id: socket.id ?? null,
        transport: socket.io?.engine?.transport?.name ?? null
    };
}

/**
 * Create a throttled emit function
 */
export function createThrottledEmit(
    socket: Socket,
    event: string,
    intervalMs: number
): (data?: unknown) => void {
    let lastEmit = 0;
    let pendingData: unknown = undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (data?: unknown) => {
        const now = Date.now();
        const timeSinceLastEmit = now - lastEmit;

        if (timeSinceLastEmit >= intervalMs) {
            lastEmit = now;
            if (data !== undefined) {
                socket.emit(event, data);
            } else {
                socket.emit(event);
            }
        } else {
            pendingData = data;
            if (!timer) {
                timer = setTimeout(() => {
                    lastEmit = Date.now();
                    if (pendingData !== undefined) {
                        socket.emit(event, pendingData);
                    } else {
                        socket.emit(event);
                    }
                    timer = null;
                }, intervalMs - timeSinceLastEmit);
            }
        }
    };
}

/**
 * Create a debounced emit function
 */
export function createDebouncedEmit(
    socket: Socket,
    event: string,
    delayMs: number
): (data?: unknown) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (data?: unknown) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            if (data !== undefined) {
                socket.emit(event, data);
            } else {
                socket.emit(event);
            }
            timer = null;
        }, delayMs);
    };
}
