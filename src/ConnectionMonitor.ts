/**
 * Honeydrop Connection Monitor
 * Tracks connection health, latency, and quality
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface ConnectionMonitorOptions {
    /** Enable automatic ping monitoring (default: true) */
    enabled?: boolean;
    /** Ping interval in ms (default: 5000) */
    pingInterval?: number;
    /** Ping timeout in ms (default: 3000) */
    pingTimeout?: number;
    /** Number of pings to average for latency (default: 5) */
    sampleSize?: number;
    /** Quality thresholds in ms */
    thresholds?: {
        excellent?: number;  // default: 50
        good?: number;       // default: 100
        fair?: number;       // default: 300
        // Above fair is 'poor'
    };
    /** Called when connection quality changes */
    onQualityChange?: (quality: ConnectionQuality, latency: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<ConnectionMonitorOptions, 'onQualityChange'>> = {
    enabled: true,
    pingInterval: 5000,
    pingTimeout: 3000,
    sampleSize: 5,
    thresholds: {
        excellent: 50,
        good: 100,
        fair: 300
    }
};

export class ConnectionMonitor {
    private socket: Socket | null = null;
    private options: ConnectionMonitorOptions;
    private logger: Logger;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private latencySamples: number[] = [];
    private currentQuality: ConnectionQuality = 'disconnected';
    private lastPingTime: number = 0;

    constructor(options: ConnectionMonitorOptions = {}, logger: Logger) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
            thresholds: { ...DEFAULT_OPTIONS.thresholds, ...options.thresholds }
        };
        this.logger = logger;
    }

    /**
     * Set the socket instance and start monitoring
     */
    setSocket(socket: Socket): void {
        this.socket = socket;

        // Listen for connection events
        socket.on('connect', () => {
            if (this.options.enabled) {
                this.start();
            }
        });

        socket.on('disconnect', () => {
            this.stop();
            this.updateQuality('disconnected', 0);
        });

        // Handle pong responses
        socket.on('pong', () => {
            const latency = Date.now() - this.lastPingTime;
            this.recordLatency(latency);
        });

        // If already connected, start monitoring
        if (socket.connected && this.options.enabled) {
            this.start();
        }
    }

    /**
     * Start automatic ping monitoring
     */
    start(): void {
        if (this.intervalId) return;

        this.logger.debug('Connection monitoring started');
        this.intervalId = setInterval(() => {
            this.ping().catch(() => {
                // Ping failed, will be handled by timeout
            });
        }, this.options.pingInterval ?? DEFAULT_OPTIONS.pingInterval);

        // Do initial ping
        this.ping().catch(() => { });
    }

    /**
     * Stop automatic ping monitoring
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logger.debug('Connection monitoring stopped');
        }
    }

    /**
     * Perform a single ping and return the latency
     */
    async ping(): Promise<number> {
        if (!this.socket?.connected) {
            throw new Error('Socket not connected');
        }

        return new Promise((resolve, reject) => {
            const timeout = this.options.pingTimeout ?? DEFAULT_OPTIONS.pingTimeout;

            const timer = setTimeout(() => {
                reject(new Error('Ping timeout'));
                this.recordLatency(timeout); // Record timeout as max latency
            }, timeout);

            this.lastPingTime = Date.now();

            // Use Socket.IO's volatile emit for ping (won't be queued)
            this.socket!.volatile.emit('ping', () => {
                clearTimeout(timer);
                const latency = Date.now() - this.lastPingTime;
                this.recordLatency(latency);
                resolve(latency);
            });
        });
    }

    /**
     * Record a latency sample and update quality
     */
    private recordLatency(latency: number): void {
        const sampleSize = this.options.sampleSize ?? DEFAULT_OPTIONS.sampleSize;

        this.latencySamples.push(latency);
        if (this.latencySamples.length > sampleSize) {
            this.latencySamples.shift();
        }

        const avgLatency = this.getAverageLatency();
        const quality = this.calculateQuality(avgLatency);

        if (quality !== this.currentQuality) {
            this.updateQuality(quality, avgLatency);
        }
    }

    /**
     * Update the current quality and notify listeners
     */
    private updateQuality(quality: ConnectionQuality, latency: number): void {
        const previousQuality = this.currentQuality;
        this.currentQuality = quality;

        this.logger.debug(`Connection quality: ${previousQuality} -> ${quality} (${latency}ms)`);
        this.options.onQualityChange?.(quality, latency);
    }

    /**
     * Calculate quality based on latency thresholds
     */
    private calculateQuality(latency: number): ConnectionQuality {
        const thresholds = { ...DEFAULT_OPTIONS.thresholds, ...this.options.thresholds };

        if (latency <= thresholds.excellent!) return 'excellent';
        if (latency <= thresholds.good!) return 'good';
        if (latency <= thresholds.fair!) return 'fair';
        return 'poor';
    }

    /**
     * Get average latency from samples
     */
    getAverageLatency(): number {
        if (this.latencySamples.length === 0) return 0;
        const sum = this.latencySamples.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.latencySamples.length);
    }

    /**
     * Get the last recorded latency
     */
    getLatency(): number {
        return this.latencySamples[this.latencySamples.length - 1] ?? 0;
    }

    /**
     * Get current connection quality
     */
    getQuality(): ConnectionQuality {
        return this.currentQuality;
    }

    /**
     * Get all latency samples
     */
    getLatencySamples(): readonly number[] {
        return [...this.latencySamples];
    }

    /**
     * Check if monitoring is active
     */
    get isMonitoring(): boolean {
        return this.intervalId !== null;
    }

    /**
     * Enable or disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.options.enabled = enabled;
        if (enabled && this.socket?.connected) {
            this.start();
        } else if (!enabled) {
            this.stop();
        }
    }
}
