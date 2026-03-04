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
    socket.on('joinRoom', (data) => {
        // Check if data is just a regular string (which means it's Unreal Engine connecting)
        if (typeof data === 'string') {
            socket.join(data);
            console.log(`🖥️ UNREAL ENGINE joined Room: ${data}`);
        } 
        // Otherwise, it's a phone sending the {room, player} data box
        else {
            socket.join(data.room);
            console.log(`📱 ${data.player} joined Room: ${data.room}`);
            
            // Broadcast the new player's name back to Unreal Engine
            io.to(data.room).emit('playerJoined', { playerName: data.player });
        }
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

}); // <--- THIS IS THE CORRECT SPOT FOR THE CLOSING BRACKET!

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});