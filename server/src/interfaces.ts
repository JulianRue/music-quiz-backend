export class User {
    name:string;
    room:string;
    points:number;
    constructor(name : string, room: string) {
        this.name = name;
        this.room = room;
        this.points = 0;
    }
    addPoints(points:number) {
        this.points += points;
    }
    removePoints(points:number){
        this.points -= points;
    }
}

export interface GameParameters {
    playlist : number[];
    room : string;
    roundCount : number;
}

export interface Song{
    id:number;
    name:string;
    interpret:string;
    url:string;
    genre:string;
    album:string;
}

export interface Room{
    currentSong:Song;
    roomNr:string;
    users:User[];
}