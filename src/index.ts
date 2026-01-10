/**
 * Honeydrop - Socket.IO Helper Library
 * A lightweight, developer-friendly helper for Socket.IO applications
 */

// Main class
export { Honeydrop, HoneydropOptions } from './Honeydrop';

// Event management
export { EventManager } from './EventManager';

// Reconnection handling
export {
    ReconnectionHandler,
    ReconnectionOptions,
    ReconnectionStrategy
} from './ReconnectionHandler';

// Namespaced events
export {
    NamespacedEvents,
    NamespacedEmitter,
    NamespaceOptions,
    NamespaceDelimiter
} from './NamespacedEvents';

// Offline queue
export {
    OfflineQueue,
    OfflineQueueOptions,
    QueuedEvent
} from './OfflineQueue';

// Connection monitor
export {
    ConnectionMonitor,
    ConnectionMonitorOptions,
    ConnectionQuality
} from './ConnectionMonitor';

// Room manager
export {
    RoomManager,
    RoomManagerOptions,
    RoomEmitter
} from './RoomManager';

// Middleware (NEW)
export {
    Middleware,
    MiddlewareType,
    MiddlewareFunction,
    MiddlewareEntry,
    MiddlewareOptions
} from './Middleware';

// Typing Indicator (NEW)
export {
    TypingIndicator,
    TypingIndicatorOptions,
    TypingUser
} from './TypingIndicator';

// Config (NEW)
export {
    loadConfig,
    generateConfigTemplate,
    configExists,
    HoneydropConfig
} from './config';

// Logging
export { Logger, LogLevel } from './logger';

// Utility functions
export {
    emitMultiple,
    emitMultipleWithAck,
    waitForEvent,
    waitForAnyEvent,
    emitWithAck,
    isConnected,
    getConnectionInfo,
    createThrottledEmit,
    createDebouncedEmit,
    EmitItem,
    EmitWithAckItem
} from './utils';

// React Hooks & Context
export {
    HoneydropProvider,
    HoneydropProviderProps,
    useHoneydrop
} from './react/HoneydropContext';

export { useSocketEvent } from './react/useSocketEvent';
export { useSocketStatus, ConnectionStatus } from './react/useSocketStatus';

// New React Hooks (NEW)
export { useSocketEmit, UseSocketEmitOptions, UseSocketEmitResult } from './react/useSocketEmit';
export { useRoom, UseRoomResult } from './react/useRoom';
export { useLatency, UseLatencyResult } from './react/useLatency';
export { useTypingIndicator, UseTypingIndicatorOptions, UseTypingIndicatorResult } from './react/useTypingIndicator';

// Default export
import { Honeydrop } from './Honeydrop';
export default Honeydrop;
