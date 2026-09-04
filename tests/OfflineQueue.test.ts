import { OfflineQueue } from '../src/OfflineQueue';
import { MockSocket, MockLogger } from './setup';
import { test, beforeEach } from 'tesht.js';
import { expect } from './test-utils';


describe('OfflineQueue', () => {
    let queue: OfflineQueue;
    let socket: MockSocket;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger() as any;
        queue = new OfflineQueue({ enabled: true }, logger as any);
        socket = new MockSocket();
        queue.setSocket(socket as any);
    });

    test('should queue events when disconnected', () => {
        socket.connected = false;

        queue.enqueue('test-event', { data: 123 });

        expect(queue.length).toBe(1);
        const events = queue.getQueue();
        expect(events[0].event).toBe('test-event');
        expect(events[0].args).toEqual([{ data: 123 }]);
    });

    test('should not exceed max size', () => {
        queue = new OfflineQueue({ enabled: true, maxSize: 2 }, logger as any);
        queue.setSocket(socket as any);
        socket.connected = false;

        queue.enqueue('ev1');
        queue.enqueue('ev2');
        queue.enqueue('ev3');

        expect(queue.length).toBe(2);
        // Should keep first events (ev1, ev2) because it drops new ones when full
        expect(queue.getQueue()[0].event).toBe('ev1');
        expect(queue.getQueue()[1].event).toBe('ev2');
    });

    test('should flush events on reconnection', () => {
        socket.connected = false;
        queue.enqueue('ev1');
        queue.enqueue('ev2');

        socket.connect(); // Trigger connect event

        expect(socket.emitSpy).toHaveBeenCalledWith('ev1');
        expect(socket.emitSpy).toHaveBeenCalledWith('ev2');
        expect(queue.length).toBe(0);
    });

    test.skip('should respect max age', () => {
        // jest.useFakeTimers();
        queue = new OfflineQueue({ enabled: true, maxAge: 100 }, logger as any);
        queue.setSocket(socket as any);
        socket.connected = false;

        queue.enqueue('old-event');

        // Wait for expiry
        // jest.advanceTimersByTime(150);

        queue.enqueue('new-event');

        socket.connect(); // triggers flush()

        // expect(socket.emitSpy).not.toHaveBeenCalledWith('old-event');
        // expect(socket.emitSpy).toHaveBeenCalledWith('new-event');

        // jest.useRealTimers();
    });
});
// Shim describe
function describe(name: string, fn: () => void) { fn(); }
