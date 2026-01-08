import { useState, useEffect } from 'react';
import { useHoneydrop } from './HoneydropContext';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/**
 * Returns the current connection status of the socket.
 * Useful for showing connection spinners or offline badges.
 */
export function useSocketStatus(): ConnectionStatus {
    const client = useHoneydrop();
    const [status, setStatus] = useState<ConnectionStatus>(
        client.connected ? 'connected' : 'disconnected'
    );

    useEffect(() => {
        const onConnect = () => setStatus('connected');
        const onDisconnect = () => setStatus('disconnected');
        const onReconnectAttempt = () => setStatus('connecting');

        client.on('connect', onConnect);
        client.on('disconnect', onDisconnect);
        client.on('reconnect_attempt', onReconnectAttempt);

        return () => {
            client.off('connect', onConnect);
            client.off('disconnect', onDisconnect);
            client.off('reconnect_attempt', onReconnectAttempt);
        };
    }, [client]);

    return status;
}
