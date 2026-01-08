import { ConnectionMonitor } from '../src/ConnectionMonitor';
import { MockSocket, MockLogger } from './setup';
import { jest } from '@jest/globals';

describe('ConnectionMonitor', () => {
    let monitor: ConnectionMonitor;
    let socket: MockSocket;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger() as any;
        monitor = new ConnectionMonitor({ enabled: true, pingInterval: 100 }, logger as any);
        socket = new MockSocket();
        monitor.setSocket(socket as any);
        jest.useFakeTimers();
    });

    afterEach(() => {
        monitor.stop();
        jest.useRealTimers();
    });

    test('should start monitoring on connect', () => {
        socket.connect();
        expect(monitor.isMonitoring).toBe(true);
    });

    test('should stop monitoring on disconnect', () => {
        socket.connect();
        socket.disconnect();
        expect(monitor.isMonitoring).toBe(false);
    });

    test('should calculate latency', async () => {
        socket.connect();

        // Mock the ping/pong flow
        let pingCallback: (latency: number) => void;
        socket.emitSpy.mockImplementation((event: any, cb: any) => {
            if (event === 'ping' && typeof cb === 'function') {
                // Simulate 50ms latency
                jest.advanceTimersByTime(50);
                cb();
            }
        });

        // Trigger manual ping
        const latency = await monitor.ping();
        expect(latency).toBe(50);
        expect(monitor.getAverageLatency()).toBe(50);
        expect(monitor.getQuality()).toBe('excellent');
    });

    test('should determine quality correctly', async () => {
        socket.connect();

        // Simulate poor connection (500ms)
        socket.emitSpy.mockImplementation((event: any, cb: any) => {
            if (event === 'ping' && typeof cb === 'function') {
                jest.advanceTimersByTime(500);
                cb();
            }
        });

        await monitor.ping();
        expect(monitor.getQuality()).toBe('poor');
    });
});
