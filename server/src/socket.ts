import http, {ClientRequest, IncomingMessage, request} from 'http';
import socketio from 'socket.io';
import db from './queries';
import {
    IChat,
    ICreateRoom,
    IGuess,
    IJoinRoom,
    ILeave,
    IGuessInfo,
    IGuessedCorrect,
    IStartGame,
    Room,
    Song,
    User, IMusicEntry, IPlaylistSingle, IPlaylistSingleNetwork
} from './interfaces'

import engine, {
    delay,
    getRandomSong,
    getRoomIndex,
    isSamePassword,
    validateGuess,
    getUsername, removeUserGlobal, getSongs, checkGuess
} from './engine';

const https = require("https"),
    fs = require("fs");


// const options = {
//     key: fs.readFileSync("/etc/letsencrypt/live/monalit.de/privkey.pem"),
//     cert: fs.readFileSync("/etc/letsencrypt/live/monalit.de/fullchain.pem")
// };

// const server = https.createServer(options);
const server = http.createServer();
const io = socketio(server);
const rooms: Room[] = [];


io.on('connection', socket => {
    console.log("User connected");
    socket.emit('connected', socket.id);
    console.log("Total Users: " + Object.keys(io.sockets.connected).length);

    socket.on('playlist-selected', (data: IPlaylistSingleNetwork) => {
        console.log(data.playlist.title + " selected");
        io.in(data.room).emit('playlist-selected', data.playlist);
    });
    socket.on('playlist-suggested', (data: IPlaylistSingleNetwork) => {
        console.log(data.playlist.title + " suggested");
        io.in(data.room).emit('playlist-suggested', data.playlist);
    });
    socket.on('playlist-selected-removed', (data: IPlaylistSingleNetwork) => {
        console.log(data.playlist.title + " selected-removed");
        io.in(data.room).emit('playlist-selected-removed', data.playlist);
    });
    socket.on('playlist-suggested-removed', (data: IPlaylistSingleNetwork) => {
        console.log(data.playlist.title + " suggested-removed");
        io.in(data.room).emit('playlist-suggested-removed', data.playlist);
    });
    socket.on('start-game', (data : IStartGame) => {
        console.log("Game started");
        io.in(data.roomName).emit('game-started', {maxRounds: data.roundCount});

        const index = getRoomIndex(rooms, data.roomName);
        let room:Room = rooms[index];
        room.isInGame = true;
        room.maxRounds = data.roundCount;
        startGame(data, room);
    });

    socket.on('create-room', (data : ICreateRoom) => {
        if (io.sockets.adapter.rooms[data.roomName] === undefined) {
            const length = rooms.push(new Room(data.roomName, data.password, socket.id, data.username));
            socket.join(data.roomName);
            console.log("Room created");
            socket.emit('room-connection', {connected: true, message: "Room created", room: data.roomName, username: data.username, isAdmin: true, isInGame: false, currentRound: 0, maxRounds: -1});
            io.in(data.roomName).emit('clients-updated', rooms[length - 1].getUsers());
        } else {
            console.log("Room already exists");
            socket.emit('room-connection', {connected: false, message: "Room already exists"});
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        const index = getRoomIndex(rooms, data.roomName);
        if (index === -1) {
            socket.emit('room-connection', {connected: false, message: "Room does not exist"});
        } else if (!isSamePassword(rooms[index].password, data.password)) {
            socket.emit('room-connection', {connected: false, message: "Wrong password"});
        } else {
            const username = getUsername(data.username, rooms[index].users);
            rooms[index].users.push(new User(socket.id, username));
            socket.join(data.roomName);
            console.log("Room joined");
            socket.emit('room-connection', {connected: true, message: "Room joined", room: data.roomName, username: username, isAdmin: false, isInGame: rooms[index].isInGame, currentRound: rooms[index].currentRound, maxRounds: rooms[index].maxRounds});
            io.in(data.roomName).emit('clients-updated', rooms[index].getUsers());
        }
    });

    socket.on('guess', (data : IGuess) => {
        let index = getRoomIndex(rooms,data.room);
        if(index == -1){
            //TODO ERROR LOG
            return;
        }
        let room = rooms[index];
        let user = room.getUser(socket.id);

        if(user.id == "-1"){
            //TODO ERROR LOG
            return;
        }

        checkGuess(user, data.text, room, socket, io);
    });

    socket.on('leave', (data : ILeave) => {
        socket.leave(data.roomName);
        const index = getRoomIndex(rooms, data.roomName);
        if(index == -1) return;

        const room:Room = rooms[index];
        const removedIndex = room.removeUser(socket.id);
        
        if (room.users.length === 0) {
            rooms.splice(index, 1);
        }
        else{
            if (removedIndex === 0) {
                room.setAdmin();
            }
            io.in(data.roomName).emit('clients-updated', room.getUsers());
        }
        console.log("Room left");
    });

});

//console.log("Return -> " + levenshtein("justin bieber (feat deine mum) ft. 187", "justin biebes (feat deine mum)"));

server.listen(8000, () => {
    console.log("Socket.io Server is listening on port 8000");
});

function startGame(params : IStartGame, room:Room) : void{
    (async () => {
        params.playlist.forEach(a => console.log(a.id + " | " + a.title));
        let songs : Song[] = await getSongs(params.playlist);
        console.log("Song counter: " + songs.length);
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = await getRandomSong(songs);
                console.log("Song counter: " + songs.length);
                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1000); // delay damit alle gleichzeitig starten!

                room.startStamp = Date.now();
                console.log("Now playing in Room: " + room.roomName);
                console.log(room.currentSong.interpret + " | " + room.currentSong.name);
                console.log("Url: " + room.currentSong.url);
                console.log("-------------------------");
                room.isSongPlaying = true;   // wenn lied dann läuft auf true setzen

                for(let j = 0; j < 30 && room.getUsers().length > 0; j++)
                    await delay(1000);   //lied läuft 30 sekunden

                room.isSongPlaying = false;
                io.in(params.roomName).emit('round-end',room.currentSong);
                for(let j = 0; j < 5 && room.getUsers().length > 0; j++)
                    await delay(1000) //pause zwischen den runden
            }
            room.isInGame = false;
        }
        catch (e) {
            console.log(e);
        }

    })();
}

export default {this:this}