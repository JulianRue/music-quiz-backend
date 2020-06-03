export class GameParameters {
    playlistIds : number[];
    roomName : string;
    gameCount : number;

    constructor(playlistIds : number[], roomName : string, gameCount : number){
        this.playlistIds = playlistIds;
        this.roomName = roomName;
        this.gameCount = gameCount;
    }
}
