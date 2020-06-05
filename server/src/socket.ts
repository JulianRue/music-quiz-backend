import http from 'http';
import socketio from 'socket.io';
import db from './queries';
import {ICreateRoom, IGameParameters, IJoinRoom, ILeave, IStartGame, Room, Song, User} from './interfaces'
import engine, {delay, getRandomSong, getRoomIndex, removeUser} from './engine';

const server = http.createServer();
const io = socketio(server);
let rooms:Room[];

io.on('connection', socket => {
    console.log("User connected");
    console.log("Total Users: " + Object.keys(io.sockets.connected).length);

    socket.on('disconnect', () => {
        console.log("User disconnected");
    });

    socket.on('start-game', (data : IStartGame) => {
        console.log("Game started");
        io.in(data.room).emit('game-started', "Game started");
        startGame(data);
    });

    socket.on('create-room', (data : ICreateRoom) => {
        if (io.sockets.adapter.rooms[data.roomName] === undefined) {
            rooms.push(new Room(data.roomName, data.password, data.username));
            socket.join(data.roomName);
            console.log("Room created");
            socket.emit('room-connection', {connected: true, message: "Room created", room: data.roomName, isAdmin: true});
        } else {
            console.log("Room already exists");
            socket.emit('room-connection', {connected: false, message: "Room already exists", room: data.roomName, isAdmin: true});
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        if (io.sockets.adapter.rooms[data.roomName] === undefined) {
            console.log("Room does not exist");
            socket.emit('room-connection', {connected: false, message: "Room does not exist", room: data.roomName, isAdmin: false});
        } else {
            var index = getRoomIndex(rooms,data.roomName);
            if(index == -1){
                socket.emit('room-connection', {connected: false, message: "Room does not exist", room: data.roomName, isAdmin: false});
                return;
            }
            rooms[index].users.push(new User(data.username));
            socket.join(data.roomName);
            console.log("Room joined");
            var roomData = io.sockets.adapter.rooms[data.roomName];
            io.in(data.roomName).emit('clients-updated', roomData.length);
            socket.emit('room-connection', {connected: true, message: "Room joined", room: data.roomName, isAdmin: false});
        }
    });

    socket.on('get-clients', (roomName: string) => {
        var roomData = io.sockets.adapter.rooms[roomName];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length
        }
        io.in(roomName).emit('clients-updated', playerCount);
    });

    socket.on('leave', (data : ILeave) => {
        socket.leave(data.roomName);
        var roomData = io.sockets.adapter.rooms[data.roomName];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length
        }
        let index = getRoomIndex(rooms, data.roomName);
        if(!removeUser(rooms[index].users, data.username)){
            console.log("Remove error!");
            console.log("Username: " + data.username);
            console.log("Room: " + data.roomName);
        }
        console.log(playerCount);
        io.in(data.roomName).emit('clients-updated', playerCount);
        console.log("Room left");
    });

});

server.listen(8000, () => {
    console.log("Socket.io Server is listening on port 8000");
});

function startGame(params : IGameParameters){
    (async () => {
        var songs : Song[] = await db.getPlaylistSongsFromIds(params.playlist);
        for(var i = 0; i < params.roundCount; i++){
            var song:Song = getRandomSong(songs);
            const timestamp = Date.now();
            io.in(params.room).emit('song-started', {url: song.url, timestamp: timestamp});

            await delay(38*1000);
        }
    })();
}





export default {this:this}