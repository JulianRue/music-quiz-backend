"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = exports.Song = exports.User = void 0;
const engine_1 = require("./engine");
class User {
    constructor(id, name, isAdmin = false) {
        this.id = id;
        this.name = name;
        this.points = 0;
        this.isAdmin = isAdmin;
        this.guessedTitle = false;
        this.guessedIntrepret = false;
        this.guessedAlbum = false;
    }
    addPoints(points) {
        this.points += points;
    }
    removePoints(points) {
        this.points -= points;
    }
    newRound() {
        this.guessedTitle = false;
        this.guessedIntrepret = false;
        this.guessedAlbum = false;
    }
}
exports.User = User;
class Song {
    constructor(id = 0, name = "", interpret = "", url = "", genre = "", album = "") {
        this.id = id;
        this.name = name;
        this.interpret = interpret;
        this.url = url;
        this.genre = genre;
        this.album = album;
    }
}
exports.Song = Song;
class Room {
    constructor(roomName, password, userId, username, adminPassword = "") {
        this.currentSong = new Song();
        this.roomName = roomName;
        this.password = password;
        this.users = Array();
        this.users.push(new User(userId, username, true));
        this.isInGame = false;
        this.adminPassword = engine_1.randomString(10);
    }
    isAdminInRoom() {
        let isAdminInRoom = true;
        const admin = this.users.find(user => user.isAdmin === true);
        if (admin === undefined) {
            isAdminInRoom = false;
        }
        return isAdminInRoom;
    }
    getUser(id) {
        if (this.users != undefined) {
            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].id == id) {
                    return this.users[i];
                }
            }
        }
        return new User("-1", "");
    }
    newRound() {
        this.users.forEach(user => user.newRound());
    }
    getUsers() {
        let iUsers = Array();
        this.users.forEach(user => iUsers.push({ username: user.name, isAdmin: user.isAdmin, points: user.points }));
        return iUsers;
    }
    removeUser(id) {
        this.users = this.users.filter(user => user.id != id);
    }
}
exports.Room = Room;
