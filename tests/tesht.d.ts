
declare module 'tesht.js' {
    export function test(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
    export namespace test {
        function skip(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
        function only(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
    }

    export function it(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
    export namespace it {
        function skip(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
        function only(name: string, fn: () => void | Promise<void>, options?: { timeout?: number }): void;
    }

    export function beforeEach(fn: () => void | Promise<void>): void;
    export function afterEach(fn: () => void | Promise<void>): void;

    export interface Mock<T = any, Y extends any[] = any> {
        (...args: Y): T;
        mock: {
            calls: Y[];
            instances: any[];
            results: { type: 'return' | 'throw', value: any }[];
            implementation: (...args: Y) => T;
        };
        mockReturnValue(value: T): Mock<T, Y>;
        mockImplementation(implementation: (...args: Y) => T): Mock<T, Y>;
        mockClear(): Mock<T, Y>;
        mockRestore(): void;
    }

    export function fn<T = any, Y extends any[] = any>(implementation?: (...args: Y) => T): Mock<T, Y>;
    export function spyOn<T extends object, K extends keyof T>(object: T, methodName: K): Mock;

    export interface Expect {
        toBe(expected: any): void;
        toEqual(expected: any): void;
        toBeTruthy(): void;
        toBeFalsy(): void;
        toThrow(expected?: string | RegExp): void;
        toBeNull(): void;
        toBeUndefined(): void;
        toContain(item: any): void;
        toBeGreaterThan(expected: number): void;
        toBeLessThan(expected: number): void;
        toHaveLength(expected: number): void;
        toHaveBeenCalled(): void;
        toHaveBeenCalledTimes(times: number): void;
        toHaveBeenCalledWith(...args: any[]): void;
    }

    export function expect(value: any): Expect;
}
