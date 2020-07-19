import http from 'http';
// import https from 'https';
// import fs from 'fs';
import socketio from 'socket.io';
import { configure, getLogger } from "log4js";
import {
    ICreateRoom,
    IGuess,
    IJoinRoom,
    ILeave,
    IStartGame,
    Room,
    User,
    IPlaylistSingleNetwork
} from './interfaces'
import {
    delay,
    getRandomSong,
    getRoomIndex,
    isSamePassword,
    getUsername,
    checkGuess
} from './engine';

configure({
    appenders: { fileAppender: { type: "file", filename: "logs/musicquiz.log" } },
    categories: { default: { appenders: ["fileAppender"], level: "all" } }
});
const logger = getLogger();

// const options = {
//     key: fs.readFileSync("/etc/letsencrypt/live/monalit.de/privkey.pem"),
//     cert: fs.readFileSync("/etc/letsencrypt/live/monalit.de/fullchain.pem")
// };

// const server = https.createServer(options);
const server = http.createServer();
const io = socketio(server);
const rooms: Room[] = [];

io.on('connection', socket => {
    logger.info("User connected");
    logger.info("Total users: " + Object.keys(io.sockets.connected).length);
    socket.emit('connected', socket.id);

    socket.on('playlist-selected', (data: IPlaylistSingleNetwork) => {
        logger.info(`Playlist ${data.playlist.title} selected in room ${data.room}`);
        io.in(data.room).emit('playlist-selected', data.playlist);
    });
    socket.on('playlist-suggested', (data: IPlaylistSingleNetwork) => {
        logger.info(`Playlist ${data.playlist.title} suggested in room ${data.room}`);
        io.in(data.room).emit('playlist-suggested', data.playlist);
    });
    socket.on('playlist-selected-removed', (data: IPlaylistSingleNetwork) => {
        logger.info(`Playlist ${data.playlist.title} removed from selected in room ${data.room}`);
        io.in(data.room).emit('playlist-selected-removed', data.playlist);
    });
    socket.on('playlist-suggested-removed', (data: IPlaylistSingleNetwork) => {
        logger.info(`Playlist ${data.playlist.title} removed from suggested in room ${data.room}`);
        io.in(data.room).emit('playlist-suggested-removed', data.playlist);
    });
    socket.on('start-game', (data : IStartGame) => {
        logger.info(`Game started in room ${data.roomName}`);
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
            logger.info(`User ${data.username} created room ${data.roomName}`);
            socket.emit('room-connection', {connected: true, message: "Room created", room: data.roomName, username: data.username, isAdmin: true, isInGame: false, currentRound: 0, maxRounds: -1});
            io.in(data.roomName).emit('clients-updated', rooms[length - 1].getUsers());
        } else {
            logger.warn(`User ${data.username} cannot create room ${data.roomName}: Room already exists`);
            socket.emit('room-connection', {connected: false, message: "Room already exists"});
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        const index = getRoomIndex(rooms, data.roomName);
        if (index === -1) {
            socket.emit('room-connection', {connected: false, message: "Room does not exist"});
            logger.warn(`User ${data.username} cannot join room ${data.roomName}: Room doesnt exist`);
        } else if (!isSamePassword(rooms[index].password, data.password)) {
            socket.emit('room-connection', {connected: false, message: "Wrong password"});
            logger.warn(`User ${data.username} cannot join room ${data.roomName}: Wrong password`);
        } else {
            const username = getUsername(data.username, rooms[index].users);
            rooms[index].users.push(new User(socket.id, username));
            socket.join(data.roomName);
            logger.info(`User ${data.username} joined room ${data.roomName}`);
            socket.emit('room-connection', {connected: true, message: "Room joined", room: data.roomName, username: username, isAdmin: false, isInGame: rooms[index].isInGame, currentRound: rooms[index].currentRound, maxRounds: rooms[index].maxRounds});
            io.in(data.roomName).emit('clients-updated', rooms[index].getUsers());
        }
    });

    socket.on('guess', (data : IGuess) => {
        let index = getRoomIndex(rooms,data.room);
        if(index == -1){
            logger.error(`Room ${data.room} cannot be found (socket on guess)`);
            return;
        }
        let room = rooms[index];
        let user = room.getUser(socket.id);

        if(user.id == "-1"){
            logger.error(`User who guessed cannot be found (socket on guess)`);
            return;
        }

        checkGuess(user, data.text, room, socket, io);
    });

    socket.on('leave', (data : ILeave) => {
        socket.leave(data.roomName);
        logger.info(`User left room ${data.roomName}`);
        const index = getRoomIndex(rooms, data.roomName);
        if(index == -1) {
            logger.error(`Room ${data.roomName} cannot be found (socket on leave)`);
            return;
        }

        const room:Room = rooms[index];
        const removedIndex = room.removeUser(socket.id);
        
        if (room.users.length === 0) {
            rooms.splice(index, 1);
            logger.info(`Room ${data.roomName} removed`);
        }
        else{
            if (removedIndex === 0) {
                room.setAdmin();
                logger.info(`New admin set in room ${data.roomName}`);
            }
            io.in(data.roomName).emit('clients-updated', room.getUsers());
        }
    });

});

server.listen(8000, () => {
    console.log("Socket.io Server is listening on port 8000");
});

function startGame(params : IStartGame, room:Room) : void{
    (async () => {
        let songs : string[] = params.ids;
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = await getRandomSong(songs[i]);
                logger.debug(`Song counter: ${songs.length}`);
                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1000); // delay damit alle gleichzeitig starten!

                room.startStamp = Date.now();
                logger.info(`"${room.currentSong.name} - ${room.currentSong.interpret}" playing in room ${params.roomName}`);
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
            logger.error(e);
        }

    })();
}

export default {this:this}