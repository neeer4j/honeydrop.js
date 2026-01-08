/**
 * Honeydrop - Main Class
 * The core Socket.IO helper providing easy connection management and event handling
 */

import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { Logger, LogLevel } from './logger';
import { EventManager } from './EventManager';
import { ReconnectionHandler, ReconnectionOptions } from './ReconnectionHandler';
import { NamespacedEvents, NamespaceOptions, NamespaceDelimiter } from './NamespacedEvents';
import { OfflineQueue, OfflineQueueOptions } from './OfflineQueue';
import { ConnectionMonitor, ConnectionMonitorOptions, ConnectionQuality } from './ConnectionMonitor';
import { RoomManager, RoomManagerOptions, RoomEmitter } from './RoomManager';
import {
    emitMultiple,
    emitMultipleWithAck,
    waitForEvent,
    waitForAnyEvent,
    emitWithAck,
    isConnected,
    getConnectionInfo,
    createThrottledEmit,
    createDebouncedEmit,
    EmitItem,
    EmitWithAckItem
} from './utils';

export interface HoneydropOptions {
    /** Enable debug logging */
    debug?: boolean;
    /** Log level */
    logLevel?: LogLevel;
    /** Reconnection configuration */
    reconnection?: ReconnectionOptions;
    /** Offline queue configuration */
    offlineQueue?: OfflineQueueOptions;
    /** Connection monitor configuration */
    connectionMonitor?: ConnectionMonitorOptions;
    /** Room manager configuration */
    roomManager?: RoomManagerOptions;
    /** Default namespace delimiter */
    namespaceDelimiter?: NamespaceDelimiter;
    /** Socket.IO client options */
    socketOptions?: Partial<ManagerOptions & SocketOptions>;
    /** Auto-connect on instantiation */
    autoConnect?: boolean;
}

const DEFAULT_OPTIONS: Required<Pick<HoneydropOptions, 'debug' | 'logLevel' | 'namespaceDelimiter' | 'autoConnect'>> = {
    debug: false,
    logLevel: 'info',
    namespaceDelimiter: ':',
    autoConnect: true
};

export class Honeydrop {
    private socket: Socket | null = null;
    private url: string;
    private options: HoneydropOptions;
    private logger: Logger;
    private eventManager: EventManager;
    private reconnectionHandler: ReconnectionHandler | null = null;
    private offlineQueue: OfflineQueue;
    private connectionMonitor: ConnectionMonitor;
    private roomManager: RoomManager;
    private namespaces: Map<string, NamespacedEvents> = new Map();

    constructor(url: string, options: HoneydropOptions = {}) {
        this.url = url;
        this.options = { ...DEFAULT_OPTIONS, ...options };

        // Initialize logger
        this.logger = new Logger({
            enabled: this.options.debug,
            level: this.options.logLevel
        });

        // Initialize event manager
        this.eventManager = new EventManager(this.logger);

        // Initialize offline queue
        this.offlineQueue = new OfflineQueue(this.options.offlineQueue ?? {}, this.logger);

        // Initialize connection monitor
        this.connectionMonitor = new ConnectionMonitor(this.options.connectionMonitor ?? {}, this.logger);

        // Initialize room manager
        this.roomManager = new RoomManager(this.options.roomManager ?? {}, this.logger);

        // Initialize reconnection handler if enabled
        if (this.options.reconnection?.enabled !== false) {
            this.reconnectionHandler = new ReconnectionHandler(
                this.options.reconnection ?? {},
                this.logger
            );
        }

        // Auto-connect if enabled
        if (this.options.autoConnect) {
            this.connect();
        }
    }

    /**
     * Connect to the Socket.IO server
     */
    connect(): Socket {
        if (this.socket?.connected) {
            this.logger.warn('Already connected');
            return this.socket;
        }

        const socketOptions: Partial<ManagerOptions & SocketOptions> = {
            ...this.options.socketOptions,
            // We handle reconnection ourselves
            reconnection: false
        };

        this.socket = io(this.url, socketOptions);
        this.eventManager.setSocket(this.socket);
        this.offlineQueue.setSocket(this.socket);
        this.connectionMonitor.setSocket(this.socket);
        this.roomManager.setSocket(this.socket);

        if (this.reconnectionHandler) {
            this.reconnectionHandler.setSocket(this.socket);
        }

        return this.socket;
    }

    /**
     * Disconnect from the server and cleanup all listeners
     */
    disconnect(): void {
        if (!this.socket) return;

        this.eventManager.removeAllListeners();
        this.reconnectionHandler?.stop();
        this.connectionMonitor.stop();
        this.socket.disconnect();
        this.logger.connection('disconnected');
    }

    /**
     * Register an event listener
     */
    on(event: string, handler: (...args: unknown[]) => void): this {
        this.eventManager.on(event, handler);
        return this;
    }

    /**
     * Register a one-time event listener
     */
    once(event: string, handler: (...args: unknown[]) => void): this {
        this.eventManager.once(event, handler);
        return this;
    }

    /**
     * Remove event listener(s)
     */
    off(event: string, handler?: (...args: unknown[]) => void): this {
        this.eventManager.off(event, handler);
        return this;
    }

    /**
     * Emit an event
     * If disconnected and offline queue is enabled, the event will be queued
     */
    emit(event: string, ...args: unknown[]): this {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        // Queue if disconnected
        if (!this.socket.connected && this.offlineQueue.enabled) {
            this.offlineQueue.enqueue(event, ...args);
            return this;
        }

        this.logger.emit(event, args.length === 1 ? args[0] : args);
        this.socket.emit(event, ...args);
        return this;
    }


    /**
     * Emit multiple events at once
     */
    emitMultiple(events: EmitItem[]): this {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        emitMultiple(this.socket, events);
        return this;
    }

    /**
     * Emit with acknowledgment
     */
    async emitWithAck(event: string, data?: unknown, timeout?: number): Promise<unknown> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return emitWithAck(this.socket, event, data, timeout);
    }

    /**
     * Request/Response pattern (RPC-style)
     * Emits an event and waits for a response event
     * @param event - Event to emit
     * @param data - Data to send
     * @param options - Request options
     */
    async request<T = unknown>(
        event: string,
        data?: unknown,
        options: { timeout?: number; responseEvent?: string } = {}
    ): Promise<T> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        const timeout = options.timeout ?? 5000;
        const responseEvent = options.responseEvent ?? `${event}:response`;

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.socket?.off(responseEvent, handler);
                reject(new Error(`Request timeout: ${event} (${timeout}ms)`));
            }, timeout);

            const handler = (response: T) => {
                clearTimeout(timer);
                resolve(response);
            };

            this.socket!.once(responseEvent, handler);
            this.logger.emit(event, data);

            if (data !== undefined) {
                this.socket!.emit(event, data);
            } else {
                this.socket!.emit(event);
            }
        });
    }

    /**
     * Emit with automatic retry on failure
     * @param event - Event to emit
     * @param data - Data to send
     * @param options - Retry options
     */
    async emitWithRetry(
        event: string,
        data?: unknown,
        options: {
            maxRetries?: number;
            retryDelay?: number;
            timeout?: number;
            onRetry?: (attempt: number, error: Error) => void;
        } = {}
    ): Promise<unknown> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        const maxRetries = options.maxRetries ?? 3;
        const retryDelay = options.retryDelay ?? 1000;
        const timeout = options.timeout ?? 5000;

        let lastError: Error = new Error('Unknown error');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await emitWithAck(this.socket, event, data, timeout);
                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warn(`Emit failed (attempt ${attempt}/${maxRetries}): ${event}`);
                options.onRetry?.(attempt, lastError);

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        throw new Error(`Emit failed after ${maxRetries} attempts: ${event}. Last error: ${lastError.message}`);
    }

    /**
     * Emit multiple events with acknowledgment
     */
    async emitMultipleWithAck(events: EmitWithAckItem[]): Promise<unknown[]> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return emitMultipleWithAck(this.socket, events);
    }

    /**
     * Register handlers for multiple events at once
     */
    onMultiple(events: string[], handler: (event: string, ...args: unknown[]) => void): this {
        this.eventManager.onMultiple(events, handler);
        return this;
    }

    /**
     * Register a handler that fires once when any of the specified events occur
     */
    onceAny(events: string[], handler: (event: string, ...args: unknown[]) => void): this {
        this.eventManager.onceAny(events, handler);
        return this;
    }

    /**
     * Wait for a specific event
     */
    async waitFor(event: string, timeout?: number): Promise<unknown> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return waitForEvent(this.socket, event, timeout);
    }

    /**
     * Wait for any of the specified events
     */
    async waitForAny(events: string[], timeout?: number): Promise<{ event: string; data: unknown }> {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return waitForAnyEvent(this.socket, events, timeout);
    }

    /**
     * Create a namespaced event emitter
     */
    namespace(name: string, options?: NamespaceOptions): NamespacedEvents {
        const key = name;

        if (!this.namespaces.has(key)) {
            const namespaceOptions: NamespaceOptions = {
                delimiter: options?.delimiter ?? this.options.namespaceDelimiter
            };

            this.namespaces.set(key, new NamespacedEvents(name, this, namespaceOptions));
        }

        return this.namespaces.get(key)!;
    }

    /**
     * Create a throttled emit function for an event
     */
    throttle(event: string, intervalMs: number): (data?: unknown) => void {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return createThrottledEmit(this.socket, event, intervalMs);
    }

    /**
     * Create a debounced emit function for an event
     */
    debounce(event: string, delayMs: number): (data?: unknown) => void {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call connect() first.');
        }

        return createDebouncedEmit(this.socket, event, delayMs);
    }

    /**
     * Get the underlying Socket.IO socket instance
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Check if connected
     */
    get connected(): boolean {
        return isConnected(this.socket);
    }

    /**
     * Get socket ID
     */
    get id(): string | undefined {
        return this.socket?.id;
    }

    /**
     * Get connection info
     */
    getConnectionInfo(): { connected: boolean; id: string | null; transport: string | null } {
        return getConnectionInfo(this.socket);
    }

    /**
     * Manually trigger reconnection
     */
    reconnect(): void {
        if (!this.reconnectionHandler) {
            throw new Error('Reconnection is not enabled');
        }

        this.reconnectionHandler.reconnect();
    }

    /**
     * Get reconnection status
     */
    getReconnectionStatus(): { isReconnecting: boolean; attempts: number } | null {
        return this.reconnectionHandler?.getStatus() ?? null;
    }

    /**
     * Get event listener count
     */
    listenerCount(event: string): number {
        return this.eventManager.listenerCount(event);
    }

    /**
     * Get all registered event names
     */
    eventNames(): string[] {
        return this.eventManager.eventNames();
    }

    /**
     * Enable or disable debug logging
     */
    setDebug(enabled: boolean): this {
        this.logger.setEnabled(enabled);
        return this;
    }

    /**
     * Set log level
     */
    setLogLevel(level: LogLevel): this {
        this.logger.setLevel(level);
        return this;
    }

    /**
     * Get the number of queued events (when offline)
     */
    getQueueLength(): number {
        return this.offlineQueue.length;
    }

    /**
     * Get all queued events (read-only)
     */
    getQueuedEvents(): readonly { event: string; args: unknown[]; timestamp: number }[] {
        return this.offlineQueue.getQueue();
    }

    /**
     * Clear the offline queue
     */
    clearQueue(): this {
        this.offlineQueue.clear();
        return this;
    }

    /**
     * Enable or disable offline queueing
     */
    setOfflineQueue(enabled: boolean): this {
        this.offlineQueue.setEnabled(enabled);
        return this;
    }

    /**
     * Ping the server and get latency
     */
    async ping(): Promise<number> {
        return this.connectionMonitor.ping();
    }

    /**
     * Get average latency to server
     */
    getLatency(): number {
        return this.connectionMonitor.getAverageLatency();
    }

    /**
     * Get current connection quality
     */
    getConnectionQuality(): ConnectionQuality {
        return this.connectionMonitor.getQuality();
    }

    /**
     * Enable or disable connection monitoring
     */
    setConnectionMonitoring(enabled: boolean): this {
        this.connectionMonitor.setEnabled(enabled);
        return this;
    }

    /**
     * Join a room
     */
    join(room: string, data?: unknown): this {
        this.roomManager.join(room, data);
        return this;
    }

    /**
     * Leave a room
     */
    leave(room: string, data?: unknown): this {
        this.roomManager.leave(room, data);
        return this;
    }

    /**
     * Create a room-scoped emitter
     */
    toRoom(room: string): RoomEmitter {
        return this.roomManager.toRoom(room);
    }

    /**
     * Get list of joined rooms
     */
    getRooms(): string[] {
        return this.roomManager.getRooms();
    }

    /**
     * Check if in a specific room
     */
    isInRoom(room: string): boolean {
        return this.roomManager.isInRoom(room);
    }
}
