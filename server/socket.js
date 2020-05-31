const http = require('http');
const server = http.createServer();
const io = require('socket.io')(server);
//import { db } from './rest'

io.on('connection', socket => {
    console.log("User connected");
    console.log("Total Users: " + io.engine.clientsCount);

    socket.on('disconnect', () => {
        console.log("User disconnected");
    });

    socket.on('start-song', data => {
        const timestamp = Date.now();
        io.in(data.room).emit('song-started', {songId: data.songId, timestamp: timestamp});
    });

    socket.on('start-game', playlists => {
        db.getPlaylistSongs()
    });

    socket.on('start-game', room => {
        console.log("Game started");
        io.in(room).emit('game-started', "Game started");
    });

    socket.on('create-room', (room) => {
        if (io.sockets.adapter.rooms[room.name] === undefined) {
            socket.join(room.name);
            console.log("Room created");
            socket.emit('room-connection', {connected: true, message: "Room created", room: room.name, isAdmin: true});
        } else {
            console.log("Room already exists");
            socket.emit('room-connection', {connected: false, message: "Room already exists", room: room.name, isAdmin: true});
        }
    });

    socket.on('join-room', (room) => {
        if (io.sockets.adapter.rooms[room.name] === undefined) {
            console.log("Room does not exist");
            socket.emit('room-connection', {connected: false, message: "Room does not exist", room: room.name, isAdmin: false});
        } else {
            socket.join(room.name);
            console.log("Room joined");
            var roomData = io.sockets.adapter.rooms[room.name];
            io.in(room.name).emit('clients-updated', roomData.length);
            socket.emit('room-connection', {connected: true, message: "Room joined", room: room.name, isAdmin: false});
        }
    });

    socket.on('get-clients', room => {
        var roomData = io.sockets.adapter.rooms[room];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length
        }
        io.in(room).emit('clients-updated', playerCount);
    });

    socket.on('leave', room => {
        socket.leave(room);
        var roomData = io.sockets.adapter.rooms[room];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length
        }
        console.log(playerCount);
        io.in(room).emit('clients-updated', playerCount);
        console.log("Room left");
    });
});

server.listen(8000, () => {
    console.log("Socket.io Server is listening on port 8000");
});

function getRandomSong(playlist){
    const number = Math.floor(Math.random() * playlist.length);
    const json = playlist[number];
    playlist.spice(number,1);
}