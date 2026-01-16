import { useState, useEffect, useCallback } from 'react';

export interface UseOnlineStatusResult {
    /** Whether the browser is online */
    isOnline: boolean;
    /** Time since last online/offline change (ms) */
    lastChanged: number | null;
    /** Whether the app was ever offline since mount */
    wasOffline: boolean;
}

/**
 * Hook for tracking browser online/offline status
 * Useful for showing network status indicators alongside socket connection
 * 
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus();
 * 
 * return (
 *   <div>
 *     {!isOnline && <Banner>You're offline</Banner>}
 *     {isOnline && wasOffline && <Toast>Back online!</Toast>}
 *   </div>
 * );
 * ```
 */
export function useOnlineStatus(): UseOnlineStatusResult {
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [lastChanged, setLastChanged] = useState<number | null>(null);
    const [wasOffline, setWasOffline] = useState(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        setLastChanged(Date.now());
    }, []);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setLastChanged(Date.now());
        setWasOffline(true);
    }, []);

    useEffect(() => {
        // Set initial offline state
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setWasOffline(true);
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, lastChanged, wasOffline };
}
