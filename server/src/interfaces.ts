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

export interface ILeave{
    roomName:string;
    username:string;
}

export interface IStartGame{
    playlist:number[];
    roundCount:number;
    room:string;
}

export class User {
    id:string;
    name:string;
    points:number;
    isAdmin:boolean;

    constructor(id: string, name: string, isAdmin: boolean = false) {
        this.id = id;
        this.name = name;
        this.points = 0;
        this.isAdmin = isAdmin;
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
    password : string;
    users:User[];

    constructor(roomName: string, password: string, userId: string, username: string) {
        this.currentSong = new Song();
        this.roomName = roomName;
        this.password = password;
        this.users = Array();
        this.users.push(new User(userId, username, true));
    }

    isAdminInRoom(): boolean {
        let isAdminInRoom = true;
        const admin = this.users.find(user => user.isAdmin === true);
        if (admin === undefined) {
            isAdminInRoom = false;
        }
        return isAdminInRoom;
    }
}