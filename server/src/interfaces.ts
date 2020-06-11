import {randomString} from "./engine";

export interface ICreateRoom{
    roomName: string;
    password : string;
    username: string;
}

export interface IJoinRoom{
    roomName: string;
    password : string;
    username: string;
}

export interface IGuess{
    room : string;
    password : string;
    text : string;
    username : string;
    userid : string;
}

export interface IChat {
    text: string;
    username: string;
    userid: string;
}

export interface ILeave{
    roomName:string;
    password : string;
    username:string;
}

export interface IStartGame{
    playlist:number[];
    password : string;
    roundCount:number;
    roomName:string;
}

export class User {
    id:string;
    name:string;
    points:number;
    isAdmin:boolean;
    guessedTitle:boolean;
    guessedIntrepret:boolean;
    guessesAlbum:boolean;

    constructor(id: string, name: string, isAdmin: boolean = false) {
        this.id = id;
        this.name = name;
        this.points = 0;
        this.isAdmin = isAdmin;
        this.guessedTitle = false;
        this.guessedIntrepret = false;
        this.guessesAlbum = false;
    }
    addPoints(points:number) {
        this.points += points;
    }
    removePoints(points:number){
        this.points -= points;
    }
}

export class Song{
    id:number;
    name:string;
    interpret:string;
    url:string;
    genre:string;
    album:string;

    constructor(id: number = 0, name: string = "", interpret: string = "", url: string = "", genre: string = "", album: string = "") {
        this.id = id;
        this.name = name;
        this.interpret = interpret;
        this.url = url;
        this.genre = genre;
        this.album = album;
    }
}

export class Room{
    currentSong:Song;
    roomName:string;
    password: string;
    adminPassword : string;
    users: User[];
    isInGame: boolean;

    constructor(roomName: string, password: string, userId: string, username: string, adminPassword: string = "") {
        this.currentSong = new Song();
        this.roomName = roomName;
        this.password = password;
        this.users = Array();
        this.users.push(new User(userId, username, true));
        this.isInGame = false;
        this.adminPassword = randomString(10);
    }

    isAdminInRoom(): boolean {
        let isAdminInRoom = true;
        const admin = this.users.find(user => user.isAdmin === true);
        if (admin === undefined) {
            isAdminInRoom = false;
        }
        return isAdminInRoom;
    }

    getUser(id:string):User{
        if(this.users != undefined){
            for(let i = 0; i < this.users.length; i++){
                if(this.users[i].id == id){
                    return this.users[i];
                }
            }
        }
        return new User("-1","");
    }
}