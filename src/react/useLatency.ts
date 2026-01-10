import { useState, useEffect } from 'react';
import { useHoneydrop } from './HoneydropContext';
import type { ConnectionQuality } from '../ConnectionMonitor';

export interface UseLatencyResult {
    /** Current latency in milliseconds */
    latency: number;
    /** Connection quality assessment */
    quality: ConnectionQuality;
    /** Manually trigger a ping */
    ping: () => Promise<number>;
}

/**
 * Hook for tracking connection latency and quality
 * Updates automatically based on connection monitor
 */
export function useLatency(): UseLatencyResult {
    const client = useHoneydrop();
    const [latency, setLatency] = useState(0);
    const [quality, setQuality] = useState<ConnectionQuality>('disconnected');

    useEffect(() => {
        // Get initial values
        setLatency(client.getLatency());
        setQuality(client.getConnectionQuality());

        // Update on connection events
        const updateLatency = () => {
            setLatency(client.getLatency());
            setQuality(client.getConnectionQuality());
        };

        // Poll for updates (since ConnectionMonitor doesn't expose quality change events through Honeydrop)
        const interval = setInterval(updateLatency, 5000);

        client.on('connect', updateLatency);
        client.on('disconnect', () => {
            setLatency(0);
            setQuality('disconnected');
        });

        return () => {
            clearInterval(interval);
            client.off('connect', updateLatency);
        };
    }, [client]);

    const ping = async (): Promise<number> => {
        const result = await client.ping();
        setLatency(result);
        setQuality(client.getConnectionQuality());
        return result;
    };

    return { latency, quality, ping };
}
