import http from 'http';
import https from 'https';
import fs from 'fs';
import socketio from 'socket.io';
import {getLogger} from 'log4js';
import {
    ICreateRoom,
    IGuess,
    IJoinRoom,
    ILeave,
    IStartGame,
    Room,
    User,
    IPlaylistSingleNetwork,
    IAddSongs,
    IChat,
    IGuessedCorrect
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
    removeRoom,
    getRoomsCount,
    rooms,
    sanitizeChat,
    formatSongName
} from './engine';
const logger = getLogger();

process.on('uncaughtException', function (err) {
    logger.fatal(err);
    console.log('UNCAUGHT_EXCEPTION ' + err);
});

const options = {
     key: fs.readFileSync('/etc/letsencrypt/live/songclasher.com/privkey.pem'),
     cert: fs.readFileSync('/etc/letsencrypt/live/songclasher.com/fullchain.pem')
};

const server = https.createServer(options);
//const server = http.createServer();
const io = socketio(server, {pingTimeout: 5000, pingInterval: 10000, perMessageDeflate: false});
const selectedLimit = 8;
const suggestLimit = 8;
const playerLimit = 12;

removeIdleRooms();

io.on('connection', socket => {
    logger.info(`connection: user connected (total users: ${Object.keys(io.sockets.connected).length})`);

    socket.on('create-room', (data : ICreateRoom) => {
        try {
            data.roomName = sanitizeChat(data.roomName);
            data.username = sanitizeChat(data.username);
            if (io.sockets.adapter.rooms[data.roomName] === undefined) {
                if(data.roomName.length > 20) {
                        throw Error('roomname too long');
                }
                if(data.password !== undefined
                    && data.password.length > 20) {
                        throw Error('password too long');
                }
                if(data.username.length > 20) {
                        throw Error('username too long');
                }

                const index = addNewRoom(new Room(data.roomName, data.password, socket.id, data.username));
                socket.join(data.roomName);
                logger.info(`create-room: room created (total rooms: ${getRoomsCount()})`);
                socket.emit('room-connection', {connected: true, message: 'created', room: data.roomName, username: data.username, isAdmin: true, status: 'lobby', currentRound: 0, maxRounds: -1});
                io.in(data.roomName).emit('clients-updated', getRoomByIndex(index).getUsers());
            } else {
                logger.warn('create-room: room already exists');
                socket.emit('room-connection', {connected: false, message: 'room'});
            }
        } catch (e) {
            logger.error('create-room: ' + e);
        }
    });

    socket.on('join-random-room', function() {
        try{
            let tempRoom: Room[] = rooms.filter(room => (room.password === undefined || room.password === '') && room.users.length < 6);
            if(tempRoom != undefined
                && tempRoom.length > 0){
                if(tempRoom.length > 1){
                    tempRoom = tempRoom.sort((a,b) => (a.users.length > b.users.length) ? -1 : ((b.users.length > a.users.length) ? 1 : 0));
                }
                socket.emit('get-random-room', tempRoom[0].roomName);
            }
            else{
                socket.emit('room-connection', {connected: false, message: 'no-room'});
            }
        }
        catch(e) {
            logger.error('join-random-room: ' + e);
        }
    });

    socket.on('join-room', (data : IJoinRoom) => {
        try {
            if(data.roomName.length > 20) {
                    throw Error('roomname too long');
            }
            if(data.password !== undefined
                && data.password.length > 20) {
                    throw Error('password too long');
            }
            if(data.username.length > 20) {
                    throw Error('username too long');
            }
            const room: Room = getRoom(data.roomName);
            if (!isSamePassword(room.password, data.password)) {
                socket.emit('room-connection', {connected: false, message: 'password'});
                logger.warn('join-room: wrong password');
            } else if (room.getUsers().length >= playerLimit) {
                socket.emit('room-connection', {connected: false, message: 'full-room'});
                logger.warn('join-room: room is full');
            } else {
                const username = getUsername(data.username, room.users);
                room.users.push(new User(socket.id, username));
                socket.join(data.roomName);
                logger.info('join-room: user joined room');
                socket.emit('room-connection', {connected: true, message: 'joined', room: data.roomName, username: username, isAdmin: false, status: room.status, currentRound: room.currentRound, maxRounds: room.maxRounds});
                socket.emit('connect-playlists', {selected: room.selectedPlaylists, suggested: room.suggestedPlaylists});
                io.in(data.roomName).emit('clients-updated', room.getUsers());
            }
        } catch (e) {
            if (e.message === 'room does not exist') {
                socket.emit('room-connection', {connected: false, message: 'no-room'});
                logger.warn('join-room: room does not exist');
            } else {
                logger.error('join-room: ' + e);
            }
        }
    });

    socket.on('playlist-selected', (data: IPlaylistSingleNetwork) => {
        try {
            const room: Room = getRoom(data.room);
            const user: User = room.getUser(socket.id);
            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            if(room.selectedPlaylists.length > selectedLimit) {
                throw Error('too many playlists selected');
            }
            if(room.selectedPlaylists.filter( local => local.id == data.playlist.id).length > 0) {
                throw Error('selected playlist already selected');
            }
            room.selectedPlaylists.push(data.playlist);
            io.in(data.room).emit('playlist-selected', data.playlist);
        } catch (e) {
            logger.error('playlist-selected: ' + e);
        }
    });

    socket.on('playlist-suggested', (data: IPlaylistSingleNetwork) => {
        try {
            const room: Room = getRoom(data.room);
            room.getUser(socket.id);
            if(room.suggestedPlaylists.length > suggestLimit) {
                throw Error('too many playlists suggested');
            }
            if(room.suggestedPlaylists.filter(local => local.id == data.playlist.id).length > 0) {
                throw Error('suggested playlist already selected');
            }
            room.suggestedPlaylists.push(data.playlist);
            io.in(data.room).emit('playlist-suggested', data.playlist);
        } catch(e) {
            logger.error('playlist-suggested: ' + e);
        }
    });

    socket.on('playlist-selected-removed', (data: IPlaylistSingleNetwork) => {
        try {
            const room:Room = getRoom(data.room);
            const user: User = room.getUser(socket.id);
            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            const index: number = room.selectedPlaylists.findIndex( a => a.id == data.playlist.id);
            if (index < 0) {
                throw Error('playlist could not be found');
            }
            room.selectedPlaylists.splice(index, 1);
            io.in(data.room).emit('playlist-selected-removed', data.playlist);
        } catch(e) {
            logger.error('playlist-selected-removed: ' + e);
        }
    });

    socket.on('playlist-suggested-removed', (data: IPlaylistSingleNetwork) => {
        try {
            const room:Room = getRoom(data.room);
            const user: User = room.getUser(socket.id);
            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            const index: number = room.suggestedPlaylists.findIndex( a => a.id == data.playlist.id);
            if (index < 0) {
                throw Error('playlist could not be found');
            }
            room.suggestedPlaylists.splice(index, 1);
            io.in(data.room).emit('playlist-suggested-removed', data.playlist);
        } catch(e) {
            logger.error('playlist-suggested-removed: ' + e);
        }
    });

    socket.on('start-game', (data : IStartGame) => {
        try {
            if(data.roundCount < 1 || data.roundCount > 100) {
                throw Error ('invalid round count');
            }
            const room:Room = getRoom(data.roomName);
            const user: User = room.getUser(socket.id);
            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            logger.info(`start-game: game started with ${data.roundCount} songs`);
            room.newGame();
            room.status = 'game';
            room.maxRounds = data.roundCount;
            io.in(data.roomName).emit('game-started', {maxRounds: data.roundCount});
            startGame(data, room);
        } catch(e) {
            logger.error('start-game: ' + e);
        }
    });

    socket.on('add-songs', (data: IAddSongs) => {
        try {
            const room: Room = getRoom(data.roomName);
            const user = room.getUser(socket.id);
            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            data.songs.forEach(song => {
                song.name = formatSongName(song.name);
                room.songs.push(song);
            });
        } catch(e) {
            logger.error('add-songs: ' + e);
        }
    });

    socket.on('guess', (data : IGuess) => {
        try {
            if (data.text.length > 100) {
                throw Error('message too long');
            }
            const room = getRoom(data.room);
            const user = room.getUser(socket.id);

            checkGuess(user, data.text, room, socket);
        } catch(e) {
            logger.error('guess: ' + e);
        }
    });

    socket.on('join-lobby', (roomName) => {
        try {
            const room:Room = getRoom(roomName);
            const user = room.getUser(socket.id);

            if(!user.isAdmin) {
                throw Error('user is not the admin');
            }
            room.selectedPlaylists = new Array();
            room.suggestedPlaylists = new Array();
            room.newGame();
            room.status = 'lobby';
            io.in(roomName).emit('lobby-joined');
        } catch(e) {
            logger.error('join-lobby: ' + e);
        }
    });

    socket.on('leave', (data : ILeave) => {
        try {
            socket.leave(data.roomName);
            logger.info('leave: user left room');
            const roomIndex = getRoomIndex(data.roomName);
            const room:Room = getRoomByIndex(roomIndex);
            const removedIndex = room.removeUser(socket.id);
            
            if (room.users.length === 0) {
                removeRoom(roomIndex);
                logger.info(`leave: room removed (total rooms: ${getRoomsCount()})`);
            } else {
                if (removedIndex === 0) {
                    room.setAdmin();
                    if(room.songs.length + room.currentRound < room.maxRounds){
                        room.songs.forEach(song => {
                            if(room.songIds.find( temp => temp === song.id) === undefined){
                                room.songIds.push(song.id);
                            }
                        });
                        io.to(room.users[0].id).emit('get-songs', room.songIds);
                    }
                }
                io.in(data.roomName).emit('clients-updated', room.getUsers());
            }
        } catch(e) {
            logger.error('leave: ' + e);
        }
    });

    socket.on('disconnecting', () => {
        try {
            const roomName = Object.keys(socket.rooms).filter(room => room != socket.id)[0];
            const roomIndex = getRoomIndex(roomName);
            const room:Room = getRoomByIndex(roomIndex);
            const removedIndex = room.removeUser(socket.id);
            
            if (room.users.length === 0) {
                removeRoom(roomIndex);
                logger.info(`disconnecting: room removed (total rooms: ${getRoomsCount()})`);
            } else {
                if (removedIndex === 0) {
                    room.setAdmin();
                    if(room.songs.length + room.currentRound < room.maxRounds){
                        room.songs.forEach(song => {
                            if(room.songIds.find( temp => temp === song.id) === undefined){
                                room.songIds.push(song.id);
                            }
                        });
                        io.to(room.users[0].id).emit('get-songs', room.songIds);
                    }
                }
                io.in(roomName).emit('clients-updated', room.getUsers());
            }
        } catch(e) {
            if (e.message !== 'room does not exist (index)') {
                logger.error('disconnecting: ' + e);
            }
        }
    });
});

server.listen(8000, () => {
    console.log('Socket.io Server is listening on port 8000');
});

function startGame(params : IStartGame, room:Room) {
    (async () => {
        params.songs.forEach(song => {
            song.name = formatSongName(song.name);
            room.songs.push(song);
        });
        try{
            for(var i = 0; i < params.roundCount && room.getUsers().length > 0; i++){
                room.newRound();
                room.currentSong = getRandomSong(room.songs);
                if(room.songs.length + room.currentRound < params.roundCount){
                    if(room.songIds.find( temp => temp === room.currentSong.id) === undefined){
                        room.songIds.push(room.currentSong.id);
                    }
                }
                else if(room.songIds.length > 0){
                    room.songIds = [];
                }

                const timestamp = Date.now();
                io.in(params.roomName).emit('song-started', {url: room.currentSong.url, timestamp: timestamp});

                for(let j = 0; j < 4 && room.getUsers().length > 0; j++)
                    await delay(1020); // delay damit alle gleichzeitig starten!

                room.startStamp = Date.now();
                room.isSongPlaying = true;   // wenn lied dann läuft auf true setzen

                for(let j = 0; j < 30 && room.getUsers().length > 0; j++)
                    await delay(1000);   //lied läuft 30 sekunden

                room.isSongPlaying = false;
                io.in(params.roomName).emit('round-end',room.currentSong);
                for(let j = 0; j < 5 && room.getUsers().length > 0 && (i+1) < params.roundCount; j++)
                    await delay(1000) //pause zwischen den runden
            }
            await delay(2000);
        }
        catch (e) {
            logger.error('startGame: ' + e.message);
        } finally {
            room.createTime = Date.now();
            room.status = 'endscreen';
            io.in(room.roomName).emit('game-ended');
        }
    })();
}

export function sendPlayerKick(roomName: string) {
    io.in(roomName).emit('kicked');
}

export function removePlayers(room: Room) {
    room.users.forEach(user => {
        io.sockets.sockets[user.id].leave(room.roomName);
    });
}

export function sendCorrectGuess(roomName: string, correctGuess: IGuessedCorrect) {
    io.in(roomName).emit('user-guessed-correct', correctGuess);
}

export function sendChatMessage(roomName: string, chat: IChat) {
    io.in(roomName).emit('chat', chat);
}

export default {this:this}