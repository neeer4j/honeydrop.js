import { expect as teshtExpect } from 'tesht.js';

type MockFunction = {
    (...args: any[]): any;
    calls: any[][];
    mockReturnValue(value: any): MockFunction;
};

export function fn(implementation?: (...args: any[]) => any): MockFunction {
    const mock = ((...args: any[]) => {
        mock.calls.push(args);
        return implementation?.(...args);
    }) as MockFunction;
    mock.calls = [];
    mock.mockReturnValue = (value: any) => {
        implementation = () => value;
        return mock;
    };
    return mock;
}

export function spyOn<T extends object, K extends keyof T>(object: T, method: K): MockFunction {
    const original = object[method] as (...args: any[]) => any;
    const spy = fn((...args: any[]) => original.apply(object, args));
    object[method] = spy as T[K];
    return spy;
}

export function expect(received: any): any {
    const assertions = teshtExpect(received) as any;
    assertions.toHaveBeenCalled = () => {
        if (!received?.calls || received.calls.length === 0) {
            throw new Error('Expected mock to have been called');
        }
    };
    assertions.toHaveBeenCalledTimes = (times: number) => {
        if (received?.calls?.length !== times) {
            throw new Error(`Expected mock to be called ${times} times, received ${received?.calls?.length ?? 0}`);
        }
    };
    assertions.toHaveBeenCalledWith = (...expectedArgs: any[]) => {
        const matches = received?.calls?.some((args: any[]) =>
            JSON.stringify(args) === JSON.stringify(expectedArgs)
        );
        if (!matches) {
            throw new Error(`Expected mock to have been called with ${JSON.stringify(expectedArgs)}`);
        }
    };
    return assertions;
}
