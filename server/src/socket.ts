import http, {ClientRequest, IncomingMessage, request} from 'http';
import socketio from 'socket.io';
import db from './queries';
import {
    IChat,
    ICreateRoom,
    IGuess,
    IGuessedCorrect,
    IJoinRoom,
    ILeave,
    IStartGame, IUser, IGuessedClose,
    Room,
    Song,
    User, IMusicEntry
} from './interfaces'

import engine, {
    delay,
    getRandomSong,
    getRoomIndex,
    isSamePassword,
    validateGuess,
    getUsername, removeUserGlobal
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
        const text = data.text.toUpperCase();
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

        if(!user.guessedTitle && room.isSongPlaying){
            let guess = validateGuess(text, room.currentSong.name, 20, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedTitle = true;
                const message:IGuessedCorrect = {username:user.name, type: "title", points:1};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                const message: IGuessedClose = {type:"title", text:data.text};
                socket.emit('guess-response', message);
            }
        }

        if(!user.guessedIntrepret && room.isSongPlaying){
            let guess = validateGuess(text, room.currentSong.interpret, 20, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedIntrepret = true;
                const message:IGuessedCorrect = {username:user.name, type: "artist", points:1};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                const message: IGuessedClose = {type:"artist", text:data.text};
                socket.emit('guess-response', message);
            }
        }

        if(!user.guessedAlbum && room.isSongPlaying){
            let guess = validateGuess(text, room.currentSong.album, 20, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedAlbum = true;
                const message:IGuessedCorrect = {username:user.name, type: "album", points:1};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                const message: IGuessedClose = {type:"album", text:data.text};
                socket.emit('guess-response', message);
            }
        }

        let chat : IChat = {text : data.text, username : user.name};
        io.in(data.room).emit('chat', chat);
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
        var songsIds : string[] = await db.getPlaylistSongsFromIds(params.playlist);
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = await getRandomSong(songsIds);
                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1000); // delay damit alle gleichzeitig starten!

                console.log("Now playing in Room: " + room.roomName);
                console.log(room.currentSong.interpret + " | " + room.currentSong.name);
                console.log("-------------------------");
                room.isSongPlaying = true;   // wenn lied dann läuft auf true setzen

                for(let j = 0; j < 30 && room.getUsers().length > 0; j++)
                    await delay(1000);   //lied läuft 30 sekunden

                room.isSongPlaying = false;

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