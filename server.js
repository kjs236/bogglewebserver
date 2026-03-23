const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: 2000,  
  pingTimeout: 4000    
});
const activeRooms = {};


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log(`⚡ A user connected: ${socket.id}`);

    // asks to join a specific Room Code
    socket.on('joinRoom', (data) => {
        if (typeof data === 'string') {
            socket.join(data);
            console.log(`🖥️ UNREAL ENGINE joined Room: ${data}`);
            
            socket.isHost = true;         
            socket.roomCode = data;       
            socket.to(data).emit('host_reconnected'); // Tell phones to unlock
            
            
            
            if (!activeRooms[data]) {
                activeRooms[data] = []; 
            }
        }
        
        else {
            const room = data.room;
            const player = data.player;

            if (!activeRooms[room]) activeRooms[room] = [];

            // Check if the name is already in the array
            if (activeRooms[room].includes(player)) {
                console.log(`⚠️ BOUNCED: Name "${player}" is already taken in Room: ${room}`);
                
                socket.emit('nameError', { message: 'Name already taken! Please choose another.' });
            } 
            else {
                
                activeRooms[room].push(player);
                
                // Save their info
                socket.playerName = player;
                socket.roomCode = room;

                socket.join(room);
                console.log(`📱 ${player} joined Room: ${room}`);
                
                io.to(room).emit('playerJoined', { playerName: player });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        if (socket.isHost) {
            console.log(`🚨 HOST DROPPED in Room ${socket.roomCode}! Locking phones...`);
            socket.to(socket.roomCode).emit('host_disconnected'); // Lock the phones!
        }
        
        else if (socket.playerName && socket.roomCode && activeRooms[socket.roomCode]) {
            activeRooms[socket.roomCode] = activeRooms[socket.roomCode].filter(name => name !== socket.playerName);
            console.log(`🧹 Cleared "${socket.playerName}" from Room ${socket.roomCode} roster.`);

            io.to(socket.roomCode).emit('playerLeft', { playerName: socket.playerName });
        }
    });

    let lastGameState = null;
    
    socket.on('server_state', (data) => {
        if (data.gameState === lastGameState) return; // nothing changed
        lastGameState = data.gameState;

        socket.to(socket.roomCode).emit('server_state', data); 
    });
   
    socket.on('wordFeedback', (data) => {
        console.log(`Feedback from Unreal for ${data.player}: ${data.message}`);
        
        socket.to(socket.roomCode).emit('displayFeedback', data); 
    });

    socket.on('roundEnded', () => {
        console.log(`🛑 Round Ended signal received from Unreal in Room ${socket.roomCode}!`);
        
        // Lock ONLY the phones in this specific room
        socket.to(socket.roomCode).emit('lockPhones'); 
    });

    socket.on('roundStarted', () => {
        console.log(`🟢 New round started in Room ${socket.roomCode}! Unlocking phones...`);
        
        // Broadcast the unlock signal ONLY to phones in this room
        socket.to(socket.roomCode).emit('unlockPhones'); 
    });

    // submits a word
    socket.on('submitWord', (data) => {
        console.log(`📝 Word received in Room [${data.room}]: "${data.word}" from Player: ${data.player}`);
        io.to(data.room).emit('wordToUnreal', data);
    });

}); 

setInterval(() => {
    io.emit('server_heartbeat');
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});