const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log(`⚡ A user connected: ${socket.id}`);

    // asks to join a specific Room Code
    socket.on('joinRoom', (roomCode) => {
        socket.join(roomCode);
        console.log(`🔌 Socket ${socket.id} joined Room: ${roomCode}`);
    });

    // submits a word
    socket.on('submitWord', (data) => {
        console.log(`📝 Word received in Room [${data.room}]: "${data.word}" from Player: ${data.player}`);
        
        // Broadcast that exact word payload to everyone in that room (which will include Unreal Engine)
        io.to(data.room).emit('wordToUnreal', data);
    });

    // When someone closes the tab
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Boggle Server running! Open a browser to http://localhost:${PORT}`);
});