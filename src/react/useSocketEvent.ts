import { useEffect, useRef } from 'react';
import { useHoneydrop } from './HoneydropContext';

/**
 * A hook to subscribe to a Socket.IO event with automatic cleanup.
 * 
 * @param event The name of the event to listen for
 * @param handler The callback function to execute when the event is received
 * @param namespace Optional namespace to listen on (defaults to root)
 */
export function useSocketEvent<T = any>(
    event: string,
    handler: (data: T) => void,
    namespace?: string
) {
    const client = useHoneydrop();
    const savedHandler = useRef(handler);

    // Updates the Ref to the latest handler so we don't need to resubscribe
    // if the handler function recreation changes (common in React).
    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const target = namespace ? client.namespace(namespace) : client;

        const eventListener = (...args: unknown[]) => {
            if (savedHandler.current) {
                // We assume the first argument is the data payload
                savedHandler.current(args[0] as T);
            }
        };

        target.on(event, eventListener);

        return () => {
            target.off(event, eventListener);
        };
    }, [event, namespace, client]);
}
