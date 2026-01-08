/**
 * Honeydrop Room Manager
 * Client-side helpers for room-based event patterns
 */

import type { Socket } from 'socket.io-client';
import { Logger } from './logger';

export interface RoomEmitter {
    /** Emit an event to the room */
    emit(event: string, ...args: unknown[]): void;
}

export interface RoomManagerOptions {
    /** Event name used to join rooms (default: 'join') */
    joinEvent?: string;
    /** Event name used to leave rooms (default: 'leave') */
    leaveEvent?: string;
}

const DEFAULT_OPTIONS: Required<RoomManagerOptions> = {
    joinEvent: 'join',
    leaveEvent: 'leave'
};

export class RoomManager {
    private socket: Socket | null = null;
    private options: RoomManagerOptions;
    private logger: Logger;
    private joinedRooms: Set<string> = new Set();

    constructor(options: RoomManagerOptions = {}, logger: Logger) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.logger = logger;
    }

    /**
     * Set the socket instance
     */
    setSocket(socket: Socket): void {
        this.socket = socket;

        // Clear rooms on disconnect
        socket.on('disconnect', () => {
            this.joinedRooms.clear();
            this.logger.debug('Cleared room list on disconnect');
        });
    }

    /**
     * Join a room
     * @param room - Room name to join
     * @param data - Optional data to send with join request
     */
    join(room: string, data?: unknown): void {
        if (!this.socket?.connected) {
            throw new Error('Socket not connected. Cannot join room.');
        }

        const joinEvent = this.options.joinEvent ?? DEFAULT_OPTIONS.joinEvent;

        if (data !== undefined) {
            this.socket.emit(joinEvent, room, data);
        } else {
            this.socket.emit(joinEvent, room);
        }

        this.joinedRooms.add(room);
        this.logger.debug(`Joined room: ${room}`);
    }

    /**
     * Leave a room
     * @param room - Room name to leave
     * @param data - Optional data to send with leave request
     */
    leave(room: string, data?: unknown): void {
        if (!this.socket?.connected) {
            throw new Error('Socket not connected. Cannot leave room.');
        }

        const leaveEvent = this.options.leaveEvent ?? DEFAULT_OPTIONS.leaveEvent;

        if (data !== undefined) {
            this.socket.emit(leaveEvent, room, data);
        } else {
            this.socket.emit(leaveEvent, room);
        }

        this.joinedRooms.delete(room);
        this.logger.debug(`Left room: ${room}`);
    }

    /**
     * Create an emitter scoped to a room
     * Events are emitted with room as first argument
     * @param room - Target room
     */
    toRoom(room: string): RoomEmitter {
        return {
            emit: (event: string, ...args: unknown[]) => {
                if (!this.socket?.connected) {
                    throw new Error('Socket not connected. Cannot emit to room.');
                }
                this.socket.emit(event, room, ...args);
                this.logger.debug(`Emitted to room ${room}: ${event}`);
            }
        };
    }

    /**
     * Get list of currently joined rooms
     */
    getRooms(): string[] {
        return Array.from(this.joinedRooms);
    }

    /**
     * Check if currently in a room
     */
    isInRoom(room: string): boolean {
        return this.joinedRooms.has(room);
    }

    /**
     * Leave all rooms
     */
    leaveAll(): void {
        for (const room of this.joinedRooms) {
            this.leave(room);
        }
    }
}
