import { useState, useCallback } from 'react';
import { useHoneydrop } from './HoneydropContext';

export interface UseSocketEmitOptions {
    /** Timeout for acknowledgment in ms (default: 5000) */
    timeout?: number;
    /** Use acknowledgment-based emit */
    withAck?: boolean;
}

export interface UseSocketEmitResult<T = unknown> {
    /** Emit function */
    emit: (data?: unknown) => Promise<T | void>;
    /** Whether an emit is in progress */
    isLoading: boolean;
    /** Last error from emit */
    error: Error | null;
    /** Reset error state */
    resetError: () => void;
}

/**
 * Hook for emitting socket events with loading and error state
 * @param event - Event name to emit
 * @param options - Emit options
 */
export function useSocketEmit<T = unknown>(
    event: string,
    options: UseSocketEmitOptions = {}
): UseSocketEmitResult<T> {
    const client = useHoneydrop();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const emit = useCallback(async (data?: unknown): Promise<T | void> => {
        setIsLoading(true);
        setError(null);

        try {
            if (options.withAck) {
                const result = await client.emitWithAck(event, data, options.timeout);
                return result as T;
            } else {
                client.emit(event, data);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [client, event, options.withAck, options.timeout]);

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return { emit, isLoading, error, resetError };
}
