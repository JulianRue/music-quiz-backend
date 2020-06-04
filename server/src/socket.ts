import http from 'http';
import socketio from 'socket.io';
import user from './user'
import db from './queries';
import {GameParameters} from './interface'

const server = http.createServer();
const io = socketio(server);

io.on('connection', socket => {
    console.log("User connected");
    console.log("Total Users: " + io.clients.length);

    socket.on('disconnect', () => {
        console.log("User disconnected");
    });

    socket.on('start-game', data => {
        //data => startGame.json (beispiel json)
        console.log("Game started");
        io.in(data.room).emit('game-started', "Game started");
        startGame(data);
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

// startGame(data_);
function startGame(params : GameParameters){
    (async () => {
        var songs : any[] = await db.getPlaylistSongsFromIds(params.playlistIds);
        for(var i = 0; i < params.gameCount; i++){
            var song = getRandomSong(songs);
            const timestamp = Date.now();
            io.in(params.roomName).emit('song-started', {url: song.url, timestamp: timestamp});
            console.log("Song -> " + JSON.stringify(song) +"\n\n");
        }
    })();
}

function getRandomSong(songs:any[]){
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number,1);
    return json;
}

export default {this:this}