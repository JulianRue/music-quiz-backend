export interface IPlaylistSingleNetwork{
    playlist: IPlaylistSingle;
    room: string;
}

export interface IPlaylist{
    data: IPlaylistSingle[];
}

export interface IPlaylistSongs{
    data: IMusicEntry[];
    next: string;
    prev: string;
}

export interface IPlaylistSingle{
    id: string;
    title: string;
    nb_tracks: number;
    picture: string;
    picture_small: string;
    picture_medium: string;
    user: {
        id: string;
        name: string;
    };
}

export interface IMusicEntry{
    id: string;
    title_short: string;
    explicit_lyrics: boolean;
    preview: string;
    bpm: string;

    contributors: [
        {
            id: string,
            name: string,
            type: string,
            role: string,
        }
    ];
    artist: {
        id: string,
        name: string,
        type: string,
        picture: string,
        picture_small: string,
        picture_medium: string,
        picture_big: string
    };
    album: {
        id: string;
        title: string,
        cover: string,
        cover_small: string,
        cover_medium: string,
        cover_big: string,
        release_date: string
    };
}

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
    text : string;
}

export interface IChat {
    text: string;
    username: string;
}

export interface IGuessedCorrect{
    username:string;
    type:string;
    points:number;
}

export interface IGuessInfo{
    type:string;
    isCorrect:boolean;
    text:string;
    correctValue:string[];
}

export interface IUser {
    username:string;
    points:number;
    isAdmin:boolean;
    correctTitle:boolean;
    correctArtist:boolean;
}
export interface ILeave{
    roomName:string;
}

export interface IStartGame{
    songs: Song[];
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
    guessedAlbum:boolean;

    constructor(id: string, name: string, isAdmin: boolean = false) {
        this.id = id;
        this.name = name;
        this.points = 0;
        this.isAdmin = isAdmin;
        this.guessedTitle = false;
        this.guessedIntrepret = false;
        this.guessedAlbum = false;
    }
    addPoints(points:number) {
        this.points += points;
    }
    removePoints(points:number){
        this.points -= points;
    }
    newRound(){
        this.guessedTitle = false;
        this.guessedIntrepret = false;
        this.guessedAlbum = false;
    }
    newGame(){
        this.newRound()
        this.points = 0;
    }
}

export class Song{
    id:string;
    name:string;
    interpret:string[];
    url:string;
    album:string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;

    constructor(id: string = "0", name: string = "", interpret: string[] = [""], url: string = "", album: string = "", cover_small: string = "", cover_medium: string = "", cover_big: string = "") {
        this.id = id;
        this.name = name;
        this.interpret = interpret;
        this.url = url;
        this.album = album;
        this.cover_small = cover_small;
        this.cover_medium = cover_medium;
        this.cover_big = cover_big;
    }
}

export class Room{
    createTime: number;
    currentSong:Song;
    roomName:string;
    password: string;
    users: User[];
    status: string;
    isSongPlaying: boolean;
    currentRound: number;
    maxRounds: number;
    titleCount: number;
    artistCount: number;
    startStamp: number;
    songs: Song[];
    selectedPlaylists: IPlaylistSingle[];
    suggestedPlaylists: IPlaylistSingle[];

    constructor(roomName: string, password: string, userId: string, username: string) {
        this.currentSong = new Song();
        this.roomName = roomName;
        this.password = password;
        this.users = Array();
        this.users.push(new User(userId, username, true));
        this.status = "lobby";
        this.isSongPlaying = false;
        this.currentRound = 0;
        this.maxRounds = -1;
        this.titleCount = 0;
        this.artistCount = 0;
        this.startStamp = 0;
        this.songs = new Array();
        this.selectedPlaylists = new Array();
        this.suggestedPlaylists = new Array();
        this.createTime = Date.now();
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

    newRound(){
        this.currentRound++;
        this.users.forEach(user => user.newRound());
        this.titleCount = 0;
        this.artistCount = 0;
    }

    newGame(){
        this.users.forEach(user => user.newGame());
        this.titleCount = 0;
        this.artistCount = 0;
        this.currentRound = 0;
        this.createTime = Date.now();
    }
    getUsers() : IUser[]{
        let iUsers:IUser[] = Array();
        this.users.forEach(user => iUsers.push({username : user.name, isAdmin : user.isAdmin, points : user.points, correctTitle: user.guessedTitle, correctArtist: user.guessedIntrepret}));
        return iUsers;
    }

    removeUser(id:string): number{
        const index = this.users.findIndex(user => user.id === id);
        this.users.splice(index, 1);
        return index;
    }

    setAdmin() {
        this.users[0].isAdmin = true;
    }
}