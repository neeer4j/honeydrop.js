# Honeydrop 🍯

[![npm version](https://img.shields.io/npm/v/honeydrop.svg)](https://www.npmjs.com/package/honeydrop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

A lightweight, developer-friendly helper library for Socket.IO applications. Simplifies real-time communication in web apps with easy connection management, automatic reconnection, and powerful utilities.

## 💡 Why Honeydrop?

I was working on a real-time project using Socket.IO myself and realized how much repetitive work was involved — managing rooms, handling reconnections, queuing events while offline, and retrying failed emits. That's why I decided to create **Honeydrop.js**, a lightweight, developer-friendly library that simplifies real-time communication and makes building robust Socket.IO apps faster and easier.

## ✨ Features

- 🔌 **Easy Connection Management** - Simple API to connect, disconnect, and manage Socket.IO connections
- 🎯 **Event Handling with Auto-Cleanup** - Register events that are automatically cleaned up on disconnect
- 🔄 **Automatic Reconnection** - Configurable retry strategies (linear/exponential backoff)
- 📛 **Namespaced Events** - Organize events into logical channels
- ⚡ **Utility Functions** - Multi-emit, multi-listen, throttle, debounce, and more
- 🐛 **Debug Logging** - Pretty-printed development logs
- 📦 **Lightweight** - No bundled dependencies, Socket.IO as peer dependency
- 🎨 **TypeScript Support** - Full type definitions included

## 📦 Installation

```bash
npm install honeydrop socket.io-client
```

## 🚀 Quick Start

```javascript
import Honeydrop from 'honeydrop';

// Create a client with auto-connect
const client = new Honeydrop('http://localhost:3000', {
  debug: true,
  reconnection: {
    enabled: true,
    maxAttempts: 5,
    strategy: 'exponential'
  }
});

// Listen for events
client.on('message', (data) => {
  console.log('Received:', data);
});

// Emit events
client.emit('chat:message', { text: 'Hello, World!' });

// Disconnect (all listeners automatically cleaned up)
client.disconnect();
```

## 📖 API Reference

### Constructor

```javascript
new Honeydrop(url, options?)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enable debug logging |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Minimum log level |
| `autoConnect` | `boolean` | `true` | Auto-connect on instantiation |
| `namespaceDelimiter` | `':' \| '/' \| '.' \| '_'` | `':'` | Delimiter for namespaced events |
| `reconnection` | `ReconnectionOptions` | — | Reconnection configuration |
| `offlineQueue` | `OfflineQueueOptions` | `{ enabled: true }` | Offline message queue configuration |
| `connectionMonitor` | `ConnectionMonitorOptions` | `{ enabled: true }` | Connection health monitoring |
| `roomManager` | `RoomManagerOptions` | — | Room join/leave event names |
| `socketOptions` | `object` | — | Socket.IO client options |

#### Reconnection Options

```javascript
{
  enabled: true,          // Enable auto-reconnection
  maxAttempts: 10,        // Maximum retry attempts
  delay: 1000,            // Initial delay (ms)
  maxDelay: 30000,        // Maximum delay (ms)
  strategy: 'exponential', // 'linear' or 'exponential'
  onReconnecting: (attempt) => {},  // Called on each attempt
  onReconnected: () => {},          // Called on success
  onFailed: () => {}                // Called when max attempts reached
}
```

#### Offline Queue Options

```javascript
{
  enabled: true,          // Enable offline queueing (default: true)
  maxSize: 100,           // Maximum events to queue (0 = unlimited)
  maxAge: 0,              // Max age in ms before discard (0 = no expiry)
  onQueued: (event) => {},    // Called when event is queued
  onFlushed: (count) => {},   // Called when queue is flushed on reconnect
  onDropped: (event) => {}    // Called when event is dropped (queue full)
}
```


### Connection Methods

```javascript
// Connect to server
client.connect();

// Disconnect and cleanup
client.disconnect();

// Check connection status
client.connected; // boolean
client.id;        // socket ID

// Get detailed connection info
client.getConnectionInfo();
// { connected: boolean, id: string | null, transport: string | null }

// Manual reconnection
client.reconnect();
```

### Event Handling

```javascript
// Register event listener
client.on('event', (data) => { /* ... */ });

// One-time listener
client.once('event', (data) => { /* ... */ });

// Remove listener
client.off('event', handler);
client.off('event'); // Remove all listeners for event

// Listen to multiple events
client.onMultiple(['user:join', 'user:leave'], (event, data) => {
  console.log(`${event}:`, data);
});

// Fire once on any of the events
client.onceAny(['success', 'error'], (event, data) => {
  console.log(`Got ${event}:`, data);
});
```

### Emitting Events

```javascript
// Basic emit
client.emit('event', data);

// Emit multiple events
client.emitMultiple([
  { event: 'init', data: { userId: 1 } },
  { event: 'status', data: { online: true } }
]);

// Emit with acknowledgment
const response = await client.emitWithAck('request', data, 5000);

// Emit multiple with acknowledgment
const responses = await client.emitMultipleWithAck([
  { event: 'validate', data: input1 },
  { event: 'validate', data: input2, timeout: 3000 }
]);

// Request/Response (RPC pattern)
const user = await client.request('getUser', { id: 123 });
// Server should emit 'getUser:response' with the result

// Emit with automatic retry
const result = await client.emitWithRetry('criticalAction', data, {
  maxRetries: 3,
  retryDelay: 1000,
  onRetry: (attempt, error) => console.log(`Retry ${attempt}`)
});
```

### Room Management

```javascript
// Join a room
client.join('room-1');

// Leave a room
client.leave('room-1');

// Emit to a specific room
client.toRoom('room-1').emit('message', { text: 'Hello room!' });

// Get joined rooms
console.log(client.getRooms()); // ['room-1']

// Check if in a room
console.log(client.isInRoom('room-1')); // true
```

### Waiting for Events

```javascript
// Wait for a specific event
const data = await client.waitFor('ready', 5000);

// Wait for any of the events
const { event, data } = await client.waitForAny(['success', 'error']);
```

### Namespaced Events

```javascript
// Create a namespace
const chat = client.namespace('chat');

// All events are prefixed with 'chat:'
chat.on('message', handler);  // Listens to 'chat:message'
chat.emit('message', data);   // Emits 'chat:message'

// Create sub-namespaces
const room = chat.sub('room1');
room.emit('join');  // Emits 'chat:room1:join'

// Custom delimiter
const api = client.namespace('api', { delimiter: '/' });
api.emit('users', query);  // Emits 'api/users'
```

### Throttle & Debounce

```javascript
// Throttled emit (max once per interval)
const throttledUpdate = client.throttle('position', 100);
// Call as often as you want, emits max 10 times/sec
throttledUpdate({ x: 100, y: 200 });

// Debounced emit (waits for pause in calls)
const debouncedSearch = client.debounce('search', 300);
// Only emits after 300ms of no calls
debouncedSearch({ query: 'hello' });
```

### Offline Queue

Events are automatically queued when disconnected and sent when reconnected:

```javascript
// Events emitted while offline are queued automatically
client.emit('message', { text: 'Hello' }); // Queued if offline

// Check queue status
console.log(client.getQueueLength()); // Number of queued events
console.log(client.getQueuedEvents()); // Array of queued events

// Clear the queue
client.clearQueue();

// Disable/enable offline queueing
client.setOfflineQueue(false);
```

### Connection Health

Monitor connection latency and quality:

```javascript
// Perform a ping and get latency
const latency = await client.ping(); // Returns latency in ms

// Get average latency
console.log(client.getLatency()); // Average latency in ms

// Get connection quality
console.log(client.getConnectionQuality()); // 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'

// Disable/enable monitoring
client.setConnectionMonitoring(false);
```

### Debugging

```javascript
// Enable/disable debug mode
client.setDebug(true);

// Set log level
client.setLogLevel('debug'); // 'debug' | 'info' | 'warn' | 'error'
```

## 🎮 Demo

Run the included demo to see Honeydrop in action:

```bash
cd demo
npm install
npm start
```

Then open `http://localhost:3000` in multiple browser tabs to test real-time communication.

## 🌐 Browser Usage

### With Bundler (Webpack, Vite, etc.)

```javascript
import Honeydrop from 'honeydrop';
```

### Via Script Tag

```html
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
<script src="path/to/honeydrop.umd.js"></script>
<script>
  const client = new Honeydrop.Honeydrop('http://localhost:3000');
</script>
```

## 📄 License

MIT © 2024
