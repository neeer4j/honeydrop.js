/**
 * Honeydrop Namespaced Events
 * Provides namespaced event prefixing for cleaner event organization
 */

export interface NamespacedEmitter {
    on(event: string, handler: (...args: unknown[]) => void): void;
    once(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler?: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
}

export type NamespaceDelimiter = ':' | '/' | '.' | '_';

export interface NamespaceOptions {
    delimiter?: NamespaceDelimiter;
}

export class NamespacedEvents {
    private name: string;
    private delimiter: NamespaceDelimiter;
    private emitter: NamespacedEmitter;

    constructor(name: string, emitter: NamespacedEmitter, options: NamespaceOptions = {}) {
        this.name = name;
        this.emitter = emitter;
        this.delimiter = options.delimiter ?? ':';
    }

    /**
     * Get the full namespaced event name
     */
    private getEventName(event: string): string {
        return `${this.name}${this.delimiter}${event}`;
    }

    /**
     * Register an event listener with namespace prefix
     */
    on(event: string, handler: (...args: unknown[]) => void): void {
        this.emitter.on(this.getEventName(event), handler);
    }

    /**
     * Register a one-time event listener with namespace prefix
     */
    once(event: string, handler: (...args: unknown[]) => void): void {
        this.emitter.once(this.getEventName(event), handler);
    }

    /**
     * Remove an event listener from namespaced event
     */
    off(event: string, handler?: (...args: unknown[]) => void): void {
        this.emitter.off(this.getEventName(event), handler);
    }

    /**
     * Emit an event with namespace prefix
     */
    emit(event: string, ...args: unknown[]): void {
        this.emitter.emit(this.getEventName(event), ...args);
    }

    /**
     * Get the namespace name
     */
    getName(): string {
        return this.name;
    }

    /**
     * Get the delimiter used for this namespace
     */
    getDelimiter(): NamespaceDelimiter {
        return this.delimiter;
    }

    /**
     * Create a sub-namespace
     */
    sub(name: string): NamespacedEvents {
        return new NamespacedEvents(
            `${this.name}${this.delimiter}${name}`,
            this.emitter,
            { delimiter: this.delimiter }
        );
    }
}
