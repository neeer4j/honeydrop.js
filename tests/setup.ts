
// Mock Socket.IO client class for Tesht
import { fn } from 'tesht.js';

export class MockSocket {
    public id: string = 'mock-socket-id';
    public connected: boolean = true;
    public callbacks: Record<string, Function[]> = {};
    public emitSpy = fn();

    on(event: string, callback: Function) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
        return this;
    }

    once(event: string, callback: Function) {
        const onceCallback = (...args: any[]) => {
            this.off(event, onceCallback);
            callback(...args);
        };
        this.on(event, onceCallback);
        return this;
    }

    off(event: string, callback?: Function) {
        if (!callback) {
            delete this.callbacks[event];
        } else if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
        return this;
    }

    emit(event: string, ...args: any[]) {
        this.emitSpy(event, ...args);
        return this;
    }

    get volatile() {
        return this;
    }

    disconnect() {
        this.connected = false;
        this.trigger('disconnect', 'io client disconnect');
        return this;
    }

    connect() {
        this.connected = true;
        this.trigger('connect');
        return this;
    }

    // Helper to trigger events from "server"
    trigger(event: string, ...args: any[]) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(...args));
        }
    }
}

// Mock Logger
export class MockLogger {
    public debug = fn();
    public info = fn();
    public warn = fn();
    public error = fn();
    public emit = fn();
    public connection = fn();
    public setEnabled = fn();
    public setLevel = fn();
}
