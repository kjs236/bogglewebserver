const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const activeRooms = {};

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
            
            // Create a blank roster for this room if it doesn't exist yet
            if (!activeRooms[data]) {
                activeRooms[data] = []; 
            }
        } 
        // Otherwise, it's a phone sending the {room, player} data box
        else {
            const room = data.room;
            const player = data.player;

            // Failsafe: create room array if it somehow doesn't exist
            if (!activeRooms[room]) activeRooms[room] = [];

            // THE BOUNCER: Check if the name is already in the array
            if (activeRooms[room].includes(player)) {
                console.log(`⚠️ BOUNCED: Name "${player}" is already taken in Room: ${room}`);
                // Emit an error ONLY back to the specific phone that tried to join
                socket.emit('nameError', { message: 'Name already taken! Please choose another.' });
            } 
            else {
                // Name is free! Add them to the tracker
                activeRooms[room].push(player);
                
                // Save their info to their specific socket so we remember who they are later
                socket.playerName = player;
                socket.roomCode = room;

                socket.join(room);
                console.log(`📱 ${player} joined Room: ${room}`);
                
                // Broadcast the new player's name back to Unreal Engine
                io.to(room).emit('playerJoined', { playerName: player });
            }
        }
    });

    // ... (Keep all your existing wordFeedback, roundEnded, roundStarted, submitWord nodes exactly as they are) ...

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        // If a phone disconnects (or refreshes), remove their name from the room's roster so they can rejoin
        if (socket.playerName && socket.roomCode && activeRooms[socket.roomCode]) {
            activeRooms[socket.roomCode] = activeRooms[socket.roomCode].filter(name => name !== socket.playerName);
            console.log(`🧹 Cleared "${socket.playerName}" from Room ${socket.roomCode} roster.`);
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

}); 


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});