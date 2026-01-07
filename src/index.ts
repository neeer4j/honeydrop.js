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

// Default export
import { Honeydrop } from './Honeydrop';
export default Honeydrop;
