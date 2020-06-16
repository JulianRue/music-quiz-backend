import http from 'http';
import socketio from 'socket.io';
import db from './queries';
import {
    IChat,
    ICreateRoom,
    IGuess,
    IGuessedCorrect,
    IJoinRoom,
    ILeave,
    IStartGame, IUser,
    Room,
    Song,
    User
} from './interfaces'

import engine, {
    delay,
    getRandomSong,
    getRoomIndex,
    isSamePassword,
    validateGuess,
    getUsername, removeUserGlobal
} from './engine';

const server = http.createServer();
const io = socketio(server);
const rooms: Room[] = [];

io.on('connection', socket => {
    console.log("User connected");
    socket.emit('connected', socket.id);
    console.log("Total Users: " + Object.keys(io.sockets.connected).length);

    socket.on('start-game', (data : IStartGame) => {
        console.log("Game started");
        io.in(data.roomName).emit('game-started', "Game started");

        const index = getRoomIndex(rooms, data.roomName);
        let room:Room = rooms[index];
        room.isInGame = true;
        startGame(data, room);
    });

    socket.on('create-room', (data : ICreateRoom) => {
        if (io.sockets.adapter.rooms[data.roomName] === undefined) {
            const length = rooms.push(new Room(data.roomName, data.password, socket.id, data.username));
            socket.join(data.roomName);
            console.log("Room created");
            socket.emit('room-connection', {connected: true, message: "Room created", room: data.roomName, username: data.username, isAdmin: true, isInGame: false});
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
            rooms[index].users.push(new User(socket.id, getUsername(data.username, rooms[index].users)));
            socket.join(data.roomName);
            console.log("Room joined");
            // TODO: ÜBERPRÜFEN OB BENUTZER MIT DEMSELBEN NAMEN IM RAUM IST, DANN NEUEN USERNAMEN AN CLIENT SCHICKEN
            socket.emit('room-connection', {connected: true, message: "Room joined", room: data.roomName, username: data.username, isAdmin: false, isInGame: rooms[index].isInGame});
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

        if(!user.guessedTitle && room.isInGame){
            let guess = validateGuess(text, room.currentSong.name, 15, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedTitle = true;
                const message:IGuessedCorrect = {username:user.name, text: "Successfully guessed the Title and got " + 1 + " points!"};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                socket.emit('guess-response', "Song title was close! Try again");
            }
        }

        if(!user.guessedIntrepret && room.isInGame){
            let guess = validateGuess(text, room.currentSong.interpret, 10, 25);
            if(guess == 1){
                user.addPoints(1);
                user.guessedIntrepret = true;
                const message:IGuessedCorrect = {username:user.name, text: "Successfully guessed the Interpret and got " + 1 + " points!"};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                socket.emit('guess-response', "Intrepret was close! Try again");
            }
        }

        if(!user.guessedAlbum && room.isInGame){
            let guess = validateGuess(text, room.currentSong.album, 15, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedAlbum = true;
                const message:IGuessedCorrect = {username:user.name, text: "Successfully guessed the Album and got " + 1 + " points!"};
                io.in(data.room).emit('user-guessed-correct', message);
                return;
            }
            else if(guess == 2){
                socket.emit('guess-response', "Album was close! Try again");
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
        room.removeUser(socket.id);

        if (!room.isAdminInRoom()) {
            console.log("No admin");
        }
        if (room.users.length === 0) {
            rooms.splice(index, 1);
        }
        else{
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
        var songs : Song[] = await db.getPlaylistSongsFromIds(params.playlist);
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = getRandomSong(songs);
                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1000); // delay damit alle gleichzeitig starten!

                room.isInGame = true;   // wenn lied dann läuft auf true setzen

                for(let j = 0; j < 30 && room.getUsers().length > 0; j++)
                    await delay(1000);   //lied läuft 30 sekunden
                room.isInGame = false;

                for(let j = 0; j < 5 && room.getUsers().length > 0; j++)
                    await delay(1000) //pause zwischen den runden
            }
        }
        catch (e) {
            console.log(e);
        }

    })();
}



export default {this:this}