import { OfflineQueue } from '../src/OfflineQueue';
import { MockSocket } from './setup';
import { jest } from '@jest/globals';

// Mock Logger
export class MockLogger {
    public debug = jest.fn();
    public info = jest.fn();
    public warn = jest.fn();
    public error = jest.fn();
    public emit = jest.fn();
    public connection = jest.fn();
    public setEnabled = jest.fn();
    public setLevel = jest.fn();
}

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

    test('should respect max age', () => {
        jest.useFakeTimers();
        queue = new OfflineQueue({ enabled: true, maxAge: 100 }, logger as any);
        queue.setSocket(socket as any);
        socket.connected = false;

        queue.enqueue('old-event');

        // Wait for expiry
        jest.advanceTimersByTime(150);

        queue.enqueue('new-event');

        const events = queue.getQueue();
        // Since we check expiry on enqueue/flush, triggering enqueue now might remove old ones?
        // Let's verify implementation: OfflineQueue doesn't periodically clean. 
        // It cleans on flush() or we can rely on manual check or implementation specific behavior.
        // Wait, enqueue implementation doesn't check expiry of *other* items.
        // Flush does.
        // But getQueue just returns them.

        // So actually, if we don't flush, the old event sits there. This test might be flawed based on implementation.
        // Let's force a flush attempt or check filtered queue if method existed.
        // Actually, let's trigger a connect to flush, and see what gets emitted.

        socket.connect(); // triggers flush()

        // 'old-event' should be expired and NOT emitted
        // 'new-event' should be emitted

        expect(socket.emitSpy).not.toHaveBeenCalledWith('old-event');
        expect(socket.emitSpy).toHaveBeenCalledWith('new-event');

        jest.useRealTimers();
    });
});
