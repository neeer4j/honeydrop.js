<div align="center">

# Honeydrop 🍯

### The Developer-Friendly Socket.IO Helper

[![npm version](https://img.shields.io/npm/v/honeydrop.svg?style=flat-square)](https://www.npmjs.com/package/honeydrop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**Simplify your real-time applications.**<br>
Effortless connection management, automatic reconnection, and powerful utilities for Socket.IO.

[Installation](#-installation) • [Quick Start](#-quick-start) • [Features](#-features) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 💡 Motivation

Building robust Socket.IO applications often involves repetitive boilerplate: managing room joins, handling reconnections gracefully, queuing events when the network drops, and implementing retry logic. 

**Honeydrop** handles this complexity for you. It wraps the standard `socket.io-client` with a powerful, developer-friendly API that makes your real-time code cleaner, more reliable, and easier to maintain.

## ✨ Features

- **🔌 effortless Connection Management**: Simple API to connect, disconnect, and monitor health.
- **🎯 Smart Event Handling**: Auto-cleanup of listeners on disconnect.
- **🔄 Robust Reconnection**: Configurable strategies (linear/exponential backoff) with hooks.
- **📛 Namespacing Made Easy**: Organize your events into logical channels (`chat:message`, `game:score`).
- **⚡ Powerful Utilities**: Multi-emit, multi-listen, throttle, debounce, and specific event waiting.
- **📦 Offline Queue**: Automatically queue events when disconnected and flush them on reconnect.
- **🐛 Dev-Friendly**: Built-in debug logging and full TypeScript support.

## 📦 Installation

> [!IMPORTANT]
> Run the following command to install the package:
> ```bash
> npm install honeydrop
> ```
> *Note: `socket.io-client` is a peer dependency and will be installed if not present.*

## 🚀 Quick Start

Here's how easy it is to get started:

```typescript
import Honeydrop from 'honeydrop';

// 1. Initialize the client
const client = new Honeydrop('http://localhost:3000', {
  autoConnect: true,
  debug: true
});

// 2. Listen for events
client.on('message', (data) => {
  console.log('Received:', data);
});

// 3. Emit events (even if currently disconnected!)
client.emit('chat:message', { text: 'Hello, World!' });

// 4. Cleanup when done
// client.disconnect();
```

## 📖 API Reference

### Client Configuration

```javascript
new Honeydrop(url, {
  debug: false,               // Enable debug logs
  autoConnect: true,          // Connect immediately
  reconnection: {             // Reconnection strategy
    enabled: true,
    maxAttempts: 10,
    strategy: 'exponential'   // 'linear' | 'exponential'
  },
  offlineQueue: {             // Offline behavior
    enabled: true,
    maxSize: 100
  }
})
```

### Core Methods

| Method | Description |
|--------|-------------|
| `connect()` | Manually connect to the server. |
| `disconnect()` | Disconnect and clean up all listeners. |
| `reconnect()` | Force a manual reconnection attempt. |
| `setDebug(bool)` | Toggle debug logging at runtime. |

### Event Handling

Honeydrop provides a rich API for event management:

```typescript
// Standard listener
client.on('user:login', (user) => console.log(user));

// One-time listener
client.once('init', () => console.log('Initialized'));

// Remove listeners
client.off('user:login');

// Listen to MULTIPLE events with one handler
client.onMultiple(['connect', 'reconnect'], () => updateStatus('online'));

// Wait for a specific event (Promise-based)
const data = await client.waitFor('ready', 5000);
```

### Emitting Events

Send data with confidence using advanced emit patterns:

```typescript
// Standard emit
client.emit('update', data);

// Emit with Acknowledgment (Async/Await)
try {
  const response = await client.emitWithAck('createUser', userData, 5000);
} catch (err) {
  console.error('Server did not acknowledge in time');
}

// Emit with Automatic Retry
// Great for critical actions that must reach the server
await client.emitWithRetry('saveData', payload, {
  maxRetries: 3,
  retryDelay: 1000
});

// Throttled Emit (e.g., for mouse movement or window resize)
const updatePosition = client.throttle('cursor:move', 100);
updatePosition({ x: 10, y: 20 });
```

### Namespaces

Organize your events into logical groups without creating multiple socket connections.

```typescript
const chat = client.namespace('chat'); // prefixes events with 'chat:'

chat.emit('msg', 'hello');       // Emits 'chat:msg'
chat.on('typing', showTyping);   // Listens for 'chat:typing'
```

### Room Management

Helper methods for room-based logic (requires server-side support for room events).

```typescript
client.join('room-123');
client.toRoom('room-123').emit('announcement', 'Welcome!');
const inRoom = client.isInRoom('room-123'); // true
```

## 🌐 Browser Support

Honeydrop works seamlessly in both Node.js and the Browser.

### Using with Bundlers (Vite, Webpack, etc.)
```javascript
import Honeydrop from 'honeydrop';
```

### Using via CDN
```html
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
<script src="https://unpkg.com/honeydrop/dist/honeydrop.umd.js"></script>
<script>
  const client = new Honeydrop.Honeydrop('http://localhost:3000');
</script>
```

## 🤝 Contributing

We welcome contributions! Please feel free to verify the correctness of your changes by running the demo app:

```bash
cd demo
npm install
npm start
```

## 📄 License

MIT © 2024 Neeraj
