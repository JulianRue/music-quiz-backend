"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const queries_1 = __importDefault(require("./queries"));
const server = http_1.default.createServer();
const io = socket_io_1.default(server);
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
            socket.emit('room-connection', { connected: true, message: "Room created", room: room.name, isAdmin: true });
        }
        else {
            console.log("Room already exists");
            socket.emit('room-connection', { connected: false, message: "Room already exists", room: room.name, isAdmin: true });
        }
    });
    socket.on('join-room', (room) => {
        if (io.sockets.adapter.rooms[room.name] === undefined) {
            console.log("Room does not exist");
            socket.emit('room-connection', { connected: false, message: "Room does not exist", room: room.name, isAdmin: false });
        }
        else {
            socket.join(room.name);
            console.log("Room joined");
            var roomData = io.sockets.adapter.rooms[room.name];
            io.in(room.name).emit('clients-updated', roomData.length);
            socket.emit('room-connection', { connected: true, message: "Room joined", room: room.name, isAdmin: false });
        }
    });
    socket.on('get-clients', room => {
        var roomData = io.sockets.adapter.rooms[room];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length;
        }
        io.in(room).emit('clients-updated', playerCount);
    });
    socket.on('leave', room => {
        socket.leave(room);
        var roomData = io.sockets.adapter.rooms[room];
        var playerCount = 0;
        if (roomData !== undefined) {
            playerCount = roomData.length;
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
function startGame(params) {
    (() => __awaiter(this, void 0, void 0, function* () {
        var songs = yield queries_1.default.getPlaylistSongsFromIds(params.playlistIds);
        for (var i = 0; i < params.gameCount; i++) {
            var song = getRandomSong(songs);
            const timestamp = Date.now();
            io.in(params.roomName).emit('song-started', { url: song.url, timestamp: timestamp });
            console.log("Song -> " + JSON.stringify(song) + "\n\n");
        }
    }))();
}
function getRandomSong(songs) {
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number, 1);
    return json;
}
exports.default = { this: this };
