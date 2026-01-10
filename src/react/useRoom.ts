import { useEffect, useCallback, useRef } from 'react';
import { useHoneydrop } from './HoneydropContext';

export interface UseRoomResult {
    /** Emit an event to the room */
    emit: (event: string, ...args: unknown[]) => void;
    /** Leave the room manually */
    leave: () => void;
    /** Check if currently in the room */
    isJoined: boolean;
}

/**
 * Hook for managing room membership with automatic cleanup
 * Automatically joins the room on mount and leaves on unmount
 * 
 * @param roomId - Room identifier to join
 * @param joinData - Optional data to send when joining
 */
export function useRoom(roomId: string, joinData?: unknown): UseRoomResult {
    const client = useHoneydrop();
    const isJoinedRef = useRef(false);

    useEffect(() => {
        // Join room on mount
        if (client.connected) {
            client.join(roomId, joinData);
            isJoinedRef.current = true;
        }

        // Also join when connection is established
        const handleConnect = () => {
            if (!isJoinedRef.current) {
                client.join(roomId, joinData);
                isJoinedRef.current = true;
            }
        };

        client.on('connect', handleConnect);

        // Cleanup: leave room on unmount
        return () => {
            client.off('connect', handleConnect);
            if (isJoinedRef.current && client.connected) {
                client.leave(roomId);
                isJoinedRef.current = false;
            }
        };
    }, [client, roomId, joinData]);

    const emit = useCallback((event: string, ...args: unknown[]) => {
        client.toRoom(roomId).emit(event, ...args);
    }, [client, roomId]);

    const leave = useCallback(() => {
        if (isJoinedRef.current) {
            client.leave(roomId);
            isJoinedRef.current = false;
        }
    }, [client, roomId]);

    return {
        emit,
        leave,
        isJoined: isJoinedRef.current
    };
}
