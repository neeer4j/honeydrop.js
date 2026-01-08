import { RoomManager } from '../src/RoomManager';
import { MockSocket, MockLogger } from './setup';
import { jest } from '@jest/globals';

describe('RoomManager', () => {
    let manager: RoomManager;
    let socket: MockSocket;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger() as any;
        manager = new RoomManager({}, logger as any);
        socket = new MockSocket();
        manager.setSocket(socket as any);
        socket.connect();
    });

    test('should join room', () => {
        manager.join('room-1');

        expect(socket.emitSpy).toHaveBeenCalledWith('join', 'room-1');
        expect(manager.isInRoom('room-1')).toBe(true);
        expect(manager.getRooms()).toContain('room-1');
    });

    test('should leave room', () => {
        manager.join('room-1');
        manager.leave('room-1');

        expect(socket.emitSpy).toHaveBeenCalledWith('leave', 'room-1');
        expect(manager.isInRoom('room-1')).toBe(false);
    });

    test('should emit to room', () => {
        const emitter = manager.toRoom('game-room');
        emitter.emit('move', { x: 10, y: 20 });

        expect(socket.emitSpy).toHaveBeenCalledWith('move', 'game-room', { x: 10, y: 20 });
    });

    test('should clear rooms on disconnect', () => {
        manager.join('room-1');
        socket.disconnect(); // Triggers disconnect handler

        expect(manager.getRooms().length).toBe(0);
    });
});
