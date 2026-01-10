import { useState, useEffect, useCallback } from 'react';
import { useHoneydrop } from './HoneydropContext';

export interface UseTypingIndicatorOptions {
    /** Event emitted when local user starts typing */
    startEvent?: string;
    /** Event emitted when local user stops typing */
    stopEvent?: string;
    /** Timeout before auto-stop in ms (default: 3000) */
    timeout?: number;
}

export interface UseTypingIndicatorResult {
    /** Call this when user types (e.g., onInput) */
    sendTyping: () => void;
    /** List of users currently typing */
    typingUsers: string[];
    /** Check if a specific user is typing */
    isUserTyping: (userId: string) => boolean;
}

/**
 * Hook for managing typing indicators in chat applications
 * @param options - Configuration options
 */
export function useTypingIndicator(
    options: UseTypingIndicatorOptions = {}
): UseTypingIndicatorResult {
    const client = useHoneydrop();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const startEvent = options.startEvent ?? 'typing:start';
    const stopEvent = options.stopEvent ?? 'typing:stop';
    const timeout = options.timeout ?? 3000;

    // Track local typing state
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const isTypingRef = { current: false };

    useEffect(() => {
        // Listen for other users typing
        const handleStart = (...args: unknown[]) => {
            const data = args[0] as { userId: string } | undefined;
            if (data?.userId) {
                setTypingUsers(prev =>
                    prev.includes(data.userId) ? prev : [...prev, data.userId]
                );
            }
        };

        const handleStop = (...args: unknown[]) => {
            const data = args[0] as { userId: string } | undefined;
            if (data?.userId) {
                setTypingUsers(prev => prev.filter(id => id !== data.userId));
            }
        };

        const handleDisconnect = () => setTypingUsers([]);

        client.on(startEvent, handleStart);
        client.on(stopEvent, handleStop);
        client.on('disconnect', handleDisconnect);

        return () => {
            client.off(startEvent, handleStart);
            client.off(stopEvent, handleStop);
            client.off('disconnect', handleDisconnect);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [client, startEvent, stopEvent]);

    const sendTyping = useCallback(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Send start if not already typing
        if (!isTypingRef.current) {
            client.emit(startEvent);
            isTypingRef.current = true;
        }

        // Set timeout to send stop
        timeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                client.emit(stopEvent);
                isTypingRef.current = false;
            }
        }, timeout);
    }, [client, startEvent, stopEvent, timeout]);

    const isUserTyping = useCallback((userId: string) => {
        return typingUsers.includes(userId);
    }, [typingUsers]);

    return { sendTyping, typingUsers, isUserTyping };
}
