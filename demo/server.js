/**
 * Honeydrop Demo Server
 * A simple Socket.IO server to demonstrate the library features
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

// Track connected clients
const clients = new Map();

// Serve static files
app.use(express.static(__dirname));

// Serve the parent dist folder for the library
app.use('/dist', express.static(join(__dirname, '..', 'dist')));

// Main page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'client.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const clientId = `User-${Math.random().toString(36).substring(2, 8)}`;
    clients.set(socket.id, clientId);

    console.log(`🟢 ${clientId} connected (${socket.id})`);

    // Notify the client of their assigned ID
    socket.emit('welcome', {
        clientId,
        message: `Welcome, ${clientId}!`,
        connectedClients: Array.from(clients.values())
    });

    // Broadcast to others that a new client joined
    socket.broadcast.emit('user:join', {
        clientId,
        connectedClients: Array.from(clients.values())
    });

    // Handle chat messages
    socket.on('chat:message', (data) => {
        console.log(`💬 ${clientId}: ${data.text}`);

        // Broadcast to all clients including sender
        io.emit('chat:message', {
            from: clientId,
            text: data.text,
            timestamp: new Date().toISOString()
        });
    });

    // Handle private messages
    socket.on('chat:private', (data) => {
        const targetSocket = Array.from(clients.entries())
            .find(([, name]) => name === data.to)?.[0];

        if (targetSocket) {
            io.to(targetSocket).emit('chat:private', {
                from: clientId,
                text: data.text,
                timestamp: new Date().toISOString()
            });
            socket.emit('chat:private:sent', {
                to: data.to,
                text: data.text
            });
        } else {
            socket.emit('error', { message: `User ${data.to} not found` });
        }
    });

    // Handle typing indicators
    socket.on('chat:typing', () => {
        socket.broadcast.emit('chat:typing', { clientId });
    });

    socket.on('chat:stopped-typing', () => {
        socket.broadcast.emit('chat:stopped-typing', { clientId });
    });

    // Handle ping for latency testing
    socket.on('ping', (data, callback) => {
        if (callback) {
            callback({ pong: true, serverTime: Date.now() });
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`🔴 ${clientId} disconnected (${reason})`);
        clients.delete(socket.id);

        io.emit('user:leave', {
            clientId,
            connectedClients: Array.from(clients.values())
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
🍯 Honeydrop Demo Server
========================
Server running at http://localhost:${PORT}

Open multiple browser tabs to test:
- Automatic connection
- Multi-client messaging
- Reconnection (try stopping/starting the server)
- Namespaced events
  `);
});
