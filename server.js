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

    // Catch the feedback from Unreal Engine
    socket.on('wordFeedback', (data) => {
      console.log(`Feedback from Unreal for ${data.player}: ${data.message}`);
      
    // Relay this package to all connected phones
      io.emit('displayFeedback', data); 
    });
    // Catch the 'Time is Up' signal from Unreal Engine
    socket.on('roundEnded', () => {
        console.log(`🛑 Round Ended signal received from Unreal!`);
        
        io.emit('lockPhones'); 
    });
    // Catch the 'New Round' signal from Unreal Engine
    socket.on('roundStarted', () => {
        console.log(`🟢 New round started! Unlocking phones...`);
        
        // Broadcast the unlock signal to all phones
        io.emit('unlockPhones'); 
    });
    // submits a word
    socket.on('submitWord', (data) => {
        console.log(`📝 Word received in Room [${data.room}]: "${data.word}" from Player: ${data.player}`);
        
        io.to(data.room).emit('wordToUnreal', data);
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Boggle Server running! Open a browser to http://localhost:${PORT}`);
});