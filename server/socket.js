const http = require('http');
const server = http.createServer();
const io = require('socket.io')(server);
const User = require('./user');
const data_ = require('./exampleJsons/startGame.json');
const db = require('./rest');

io.on('connection', socket => {
    console.log("User connected");
    console.log("Total Users: " + io.engine.clientsCount);

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

/*
function user(name, room){
    this.name = name;
    this.room = room;
    this.points = 0;
}
*/



//const user = new User('peter', '123');
//user.addPoints(1);
//console.log(user.getPoints());

// startGame(data_);
function startGame(data){
    //data => startGame.json (beispiel json)
    (async () => {
        var songs = await db.getPlaylistFromIds(data.playlist);
        for(var i = 0; i < data.roundCount; i++){
            var song = getRandomSong(songs);
            const timestamp = Date.now();
            io.in(data.room).emit('song-started', {url: song.url, timestamp: timestamp});
            console.log("Song -> " + JSON.stringify(song) +"\n\n");
        }
    })();
}

function getRandomSong(songs){
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number,1);
    return json;
}