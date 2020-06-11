import http from 'http';
import socketio from 'socket.io';
import db from './queries';
import {IChat, ICreateRoom, IGuess, IJoinRoom, ILeave, IStartGame, Room, Song, User} from './interfaces'
import engine, {delay, getRandomSong, getRoomIndex, removeUser, isSamePassword, validateGuess} from './engine';

const server = http.createServer();
const io = socketio(server);
const rooms: Room[] = [];

io.on('connection', socket => {
    console.log(socket.id);
    console.log("User connected");
    console.log("Total Users: " + Object.keys(io.sockets.connected).length);

    socket.on('disconnect', () => {
        console.log("User disconnected");
    });

    socket.on('start-game', (data : IStartGame) => {
        const roomName = data.roomName.toUpperCase();
        console.log("Game started");
        io.in(roomName).emit('game-started', "Game started");
        startGame(data);
        const index = getRoomIndex(rooms, roomName);
        rooms[index].isInGame = true;
    });

    socket.on('create-room', (data : ICreateRoom) => {
        const roomName = data.roomName.toUpperCase();
        if (io.sockets.adapter.rooms[roomName] === undefined) {
            const length = rooms.push(new Room(roomName, data.password, socket.id, data.username));
            socket.join(roomName);
            console.log("Room created");
            socket.emit('room-connection', {connected: true, message: "Room created", room: roomName, isAdmin: true});
            io.in(roomName).emit('clients-updated', rooms[length - 1].users);
        } else {
            console.log("Room already exists");
            socket.emit('room-connection', {connected: false, message: "Room already exists", room: roomName, isAdmin: true});
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        const roomName = data.roomName.toUpperCase();
        const index = getRoomIndex(rooms, roomName);
        if (index === -1) {
            socket.emit('room-connection', {connected: false, message: "Room does not exist", room: roomName, isAdmin: false});
        } else if (!isSamePassword(rooms[index].password, data.password)) {
            socket.emit('room-connection', {connected: false, message: "Wrong password", room: roomName, isAdmin: false});
        } else {
            rooms[index].users.push(new User(socket.id, data.username));
            socket.join(roomName);
            console.log("Room joined");
            socket.emit('room-connection', {connected: true, message: "Room joined", room: roomName, isAdmin: false, isInGame: rooms[index].isInGame});
            io.in(roomName).emit('clients-updated', rooms[index].users);
        }
    });

    socket.on('guess', (data : IGuess) => {
        let index = getRoomIndex(rooms,data.room);
        if(index == -1){
            //TODO ERROR LOG
            return;
        }
        let room = rooms[index];
        let user = room.getUser(data.userid);

        if(user.id == "-1"){
            //TODO ERROR LOG
            return;
        }

        if(!user.guessedTitle){
            let guess = validateGuess(data.text, room.currentSong.name, 15, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessedTitle = true;
                io.in(data.room).emit('user-guessed-title', user);
                return;
            }
            else if(guess == 2){
                io.emit('guess-response', "Song title was close! Try again");
            }
        }

        if(!user.guessedIntrepret){
            let guess = validateGuess(data.text, room.currentSong.interpret, 10, 25);
            if(guess == 1){
                user.addPoints(1);
                user.guessedIntrepret = true;
                io.in(data.room).emit('user-guessed-interpret', user);
                return;
            }
            else if(guess == 2){
                io.emit('guess-response', "Intrepret was close! Try again");
            }
        }

        if(!user.guessesAlbum){
            let guess = validateGuess(data.text, room.currentSong.album, 15, 30);
            if(guess == 1){
                user.addPoints(1);
                user.guessesAlbum = true;
                io.in(data.room).emit('user-guessed-album', user);
                return;
            }
            else if(guess == 2){
                io.emit('guess-response', "Album was close! Try again");
            }
        }

        let chat : IChat = {text : data.text, username : data.username, userid : data.userid};
        io.in(data.room).emit('chat', chat);
    });
    socket.on('leave', (data : ILeave) => {
        const roomName = data.roomName.toUpperCase();
        socket.leave(roomName);
        const index = getRoomIndex(rooms, roomName);
        const users: User[] = removeUser(rooms[index].users, data.username);
        if (!rooms[index].isAdminInRoom()) {
            console.log("No admin");
        }
        if (rooms[index].users.length === 0) {
            rooms.splice(index, 1);
        }
        io.in(roomName).emit('clients-updated', users);
        console.log("Room left");
    });

});

//console.log("Return -> " + levenshtein("justin bieber (feat deine mum) ft. 187", "justin biebes (feat deine mum)"));

server.listen(8000, () => {
    console.log("Socket.io Server is listening on port 8000");
});

function startGame(params : IStartGame){
    (async () => {
        var songs : Song[] = await db.getPlaylistSongsFromIds(params.playlist);
        for(var i = 0; i < params.roundCount; i++){
            var song:Song = getRandomSong(songs);
            const timestamp = Date.now();
            io.in(params.roomName).emit('song-started', {url: song.url, timestamp: timestamp});

            await delay(38*1000);
        }
    })();
}



export default {this:this}