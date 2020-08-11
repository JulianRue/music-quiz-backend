import http from 'http';
// import https from 'https';
// import fs from 'fs';
import socketio from 'socket.io';
import { getLogger } from "log4js";
import {
    ICreateRoom,
    IGuess,
    IJoinRoom,
    ILeave,
    IStartGame,
    Room,
    User,
    IPlaylistSingleNetwork,
    IAddSongs
} from './interfaces'
import {
    delay,
    getRandomSong,
    getRoomIndex,
    isSamePassword,
    getUsername,
    checkGuess,
    getRoom,
    removeIdleRooms,
    getRoomByIndex,
    addNewRoom,
    removeRoom
} from './engine';

const logger = getLogger();

// const options = {
//     key: fs.readFileSync("/etc/letsencrypt/live/monalit.de/privkey.pem"),
//     cert: fs.readFileSync("/etc/letsencrypt/live/monalit.de/fullchain.pem")
// };

// const server = https.createServer(options);
const server = http.createServer();
const io = socketio(server);
const selectedLimit = 8;
const suggestLimit = 8;
const playerLimit = 12;

removeIdleRooms();

io.on('connection', socket => {
    logger.info(`connection: user connected (${Object.keys(io.sockets.connected).length} total users)`);

    socket.on('disconnect', () => {
        /*
        logger.info(`disconnect: user disconnected (${Object.keys(io.sockets.connected).length} total users)`);
        let room = rooms.find(r => r.users.find(u => u.id == socket.id) !== undefined)
        if(room !== undefined){
            room.removeUser(socket.id);
            io.in(room.roomName).emit('clients-updated', room.getUsers());
            if(room.users.length == 0){// @ts-ignore
                let index = rooms.findIndex( r => r.roomName === room.roomName);
                if(index != -1){
                    rooms.splice(index, 1);
                }
            }
        }
        */
    });

    socket.on('playlist-selected', (data: IPlaylistSingleNetwork) => {
        let room:Room | undefined = getRoom(data.room);
        if(room === undefined) {
            logger.error(`playlist-selected: room "${data.room}" is undefined`);
            return;
        }
        if(room.selectedPlaylists.length > selectedLimit) {
            logger.error(`playlist-selected: too many playlists selected in room "${data.room}"`);
            return;
        }
        if(room.selectedPlaylists.filter( local => local.id == data.playlist.id).length > 0) {
            logger.error(`playlist-selected: selected playlist already selected`);
            return;
        }
        let user: User = room.getUser(socket.id);
        if(user.id === '-1') {
            logger.error(`playlist-selected: user not found in room "${data.room}"`);
            return;
        }
        if(user.isAdmin){
            room.selectedPlaylists.push(data.playlist);
            io.in(data.room).emit('playlist-selected', data.playlist);
        }
    });
    socket.on('playlist-suggested', (data: IPlaylistSingleNetwork) => {
        let room:Room | undefined = getRoom(data.room);
        if(room === undefined) {
            logger.error(`playlist-suggested: room "${data.room}" is undefined`);
            return;
        }
        if(room.suggestedPlaylists.length > suggestLimit) {
            logger.error(`playlist-suggested: too many playlists suggested in room "${data.room}"`);
            return;
        }
        if(room.suggestedPlaylists.filter(local => local.id == data.playlist.id).length > 0) {
            logger.error(`playlist-selected: suggested playlist already selected`);
            return;
        }
        let user: User = room.getUser(socket.id);
        if(user.id === '-1') {
            logger.error(`playlist-suggested: user not found in room "${data.room}"`);
            return;
        }
        room.suggestedPlaylists.push(data.playlist);
        io.in(data.room).emit('playlist-suggested', data.playlist);
    });
    socket.on('playlist-selected-removed', (data: IPlaylistSingleNetwork) => {
        let room:Room | undefined = getRoom(data.room);
        if(room === undefined) {
            logger.error(`playlist-selected-removed: room "${data.room}" is undefined`);
            return;
        }
        if(room.selectedPlaylists.length == 0) {
            logger.error(`playlist-selected-removed: not enough playlists in room "${data.room}"`);
            return;
        }
        let user: User = room.getUser(socket.id);
        if(user.id === '-1') {
            logger.error(`playlist-selected-removed: user not found in room "${data.room}"`);
            return;
        }
        if(!user.isAdmin) {
            logger.error(`playlist-selected-removed: "${user.name}" is not the admin in room "${data.room}"`);
            return;
        }
        let index: number = room.selectedPlaylists.findIndex( a => a.id == data.playlist.id);
        if(index < 0) {
            logger.error(`playlist-selected-removed: playlist could not be removed in room "${data.room}"`);
            return;
        }
        room.selectedPlaylists.splice(index,1);
        io.in(data.room).emit('playlist-selected-removed', data.playlist);
    });
    socket.on('playlist-suggested-removed', (data: IPlaylistSingleNetwork) => {
        let room:Room | undefined = getRoom(data.room);
        if(room === undefined) {
            logger.error(`playlist-suggested-removed: room "${data.room}" is undefined`);
            return;
        }
        if(room.suggestedPlaylists.length == 0) {
            logger.error(`playlist-suggested-removed: not enough playlists in room "${data.room}"`);
            return;
        }
        let user: User = room.getUser(socket.id);
        if(user.id === '-1') {
            logger.error(`playlist-suggested-removed: user not found in room "${data.room}"`);
            return;
        }
        if(!user.isAdmin) {
            logger.error(`playlist-suggested-removed: "${user.name}" is not the admin in room "${data.room}"`);
            return;
        }
        let index: number = room.suggestedPlaylists.findIndex( a => a.id == data.playlist.id);
        if(index < 0) {
            logger.error(`playlist-suggested-removed: playlist could not be removed in room "${data.room}"`);
            return;
        }
        room.suggestedPlaylists.splice(index,1);
        io.in(data.room).emit('playlist-suggested-removed', data.playlist);
    });
    socket.on('start-game', (data : IStartGame) => {
        let room:Room | undefined = getRoom(data.roomName);
        if(room === undefined) {
            logger.error(`start-game: room "${data.roomName}" is undefined`);
            return;
        }
        let user: User = room.getUser(socket.id);
        if(user.id === '-1') {
            logger.error(`start-game: user not found in room "${data.roomName}"`);
            return;
        }
        if(!user.isAdmin) {
            logger.error(`start-game: "${user.name}" is not the admin in room "${data.roomName}"`);
            return;
        }
        logger.info(`start-game: game started in room "${data.roomName}" with "${data.songs.length}" songs`);
        //TODO runden größe checken => genug songs?
        io.in(data.roomName).emit('game-started', {maxRounds: data.roundCount});
        room.selectedPlaylists = new Array();
        room.suggestedPlaylists = new Array();
        room.newGame();
        room.status = "game";
        room.maxRounds = data.roundCount;
        startGame(data, room);
    });
    socket.on('join-lobby', (roomName) => {
        let room:Room | undefined = getRoom(roomName);
        if(room === undefined) {
            logger.error(`join-lobby: room "${roomName}" cannot be found`);
            return;
        }
        room.status = "lobby";
        io.in(roomName).emit('lobby-joined');
    })
    socket.on('add-songs', (data: IAddSongs) => {
        logger.info(data.songs.length + " Songs wurden hinzugefügt");
        const index = getRoomIndex(data.roomName);
        const room: Room = getRoomByIndex(index);
        data.songs.forEach(a => room.songs.push(a));
        console.log(data.songs.length + " Songs added -> count now " + room.songs.length);
    });
    socket.on('create-room', (data : ICreateRoom) => {
        if (io.sockets.adapter.rooms[data.roomName] === undefined) {
            const index = addNewRoom(new Room(data.roomName, data.password, socket.id, data.username));
            socket.join(data.roomName);
            logger.info(`create-room: user "${data.username}" created room "${data.roomName}"`);
            socket.emit('room-connection', {connected: true, message: "Room created", room: data.roomName, username: data.username, isAdmin: true, status: "lobby", currentRound: 0, maxRounds: -1});
            io.in(data.roomName).emit('clients-updated', getRoomByIndex(index).getUsers());
        } else {
            logger.warn(`create-room: user "${data.username}" cannot create room "${data.roomName}" (Room already exists)`);
            socket.emit('room-connection', {connected: false, message: "room"});
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        const index = getRoomIndex(data.roomName);
        const room: Room = getRoomByIndex(index);
        if (index === -1) {
            socket.emit('room-connection', {connected: false, message: "no-room"});
            logger.warn(`join-room: user "${data.username}" cannot join room "${data.roomName}" (room doesn't exist)`);
        } else if (!isSamePassword(room.password, data.password)) {
            socket.emit('room-connection', {connected: false, message: "password"});
            logger.warn(`join-room: user "${data.username}" cannot join room "${data.roomName}" (wrong password)`);
        } else if (room.getUsers().length >= playerLimit) {
            socket.emit('room-connection', {connected: false, message: "full-room"});
            logger.warn(`join-room: user "${data.username}" cannot join room "${data.roomName}" (room is full)`);
        } else {
            const username = getUsername(data.username, room.users);
            room.users.push(new User(socket.id, username));
            socket.join(data.roomName);
            logger.info(`join-room: user "${data.username}" joined room "${data.roomName}"`);
            socket.emit('room-connection', {connected: true, message: "Room joined", room: data.roomName, username: username, isAdmin: false, status: room.status, currentRound: room.currentRound, maxRounds: room.maxRounds});
            socket.emit('connect-playlists', {selected: room.selectedPlaylists, suggested: room.suggestedPlaylists});
            io.in(data.roomName).emit('clients-updated', room.getUsers());
        }
    });

    socket.on('guess', (data : IGuess) => {
        const index = getRoomIndex(data.room);
        if(index == -1){
            logger.error(`guess: room "${data.room}" cannot be found`);
            return;
        }
        const room = getRoomByIndex(index);
        const user = room.getUser(socket.id);

        if(user.id == "-1"){
            logger.error(`guess: user cannot be found in room "${data.room}"`);
            return;
        }

        checkGuess(user, data.text, room, socket, io);
    });

    socket.on('leave', (data : ILeave) => {
        socket.leave(data.roomName);
        logger.info(`leave: user left room "${data.roomName}"`);
        const index = getRoomIndex(data.roomName);
        if(index == -1) {
            logger.error(`leave: room "${data.roomName}" cannot be found`);
            return;
        }

        const room:Room = getRoomByIndex(index);
        const removedIndex = room.removeUser(socket.id);
        
        if (room.users.length === 0) {
            removeRoom(index);
            logger.info(`leave: room "${data.roomName}" removed`);
        }
        else{
            if (removedIndex === 0) {
                room.setAdmin();
                logger.info(`leave: new admin set in room "${data.roomName}"`);
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
        params.songs.forEach(a => room.songs.push(a));
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = getRandomSong(room.songs);
                if(room.currentSong === undefined){
                    console.log("Thrown!")
                    throw new Error('Something bad happened');
                }
                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1020); // delay damit alle gleichzeitig starten!

                room.startStamp = Date.now();
                logger.info(`function startGame: "${room.currentSong.id}" playing in room "${params.roomName}"`);
                room.isSongPlaying = true;   // wenn lied dann läuft auf true setzen

                for(let j = 0; j < 30 && room.getUsers().length > 0; j++)
                    await delay(1000);   //lied läuft 30 sekunden

                room.isSongPlaying = false;
                io.in(params.roomName).emit('round-end',room.currentSong);
                for(let j = 0; j < 5 && room.getUsers().length > 0; j++)
                    await delay(1000) //pause zwischen den runden
            }
            room.createTime = Date.now();
            room.status = "endscreen";
            io.in(room.roomName).emit('game-ended');
        }
        catch (e) {
            logger.error(e);
            room.createTime = Date.now();
            room.status = "endscreen";
            io.in(room.roomName).emit('game-ended');
        }

    })();
}

export function kickUsersForInactivity(roomName: string) {
    io.in(roomName).emit('kicked-for-inactivity');
}


export default {this:this}