import {
    IChat,
    IGuessedCorrect,
    IGuessInfo,
    IMusicEntry,
    IPlaylist,
    IPlaylistSingle,
    IPlaylistSongs,
    Room,
    Song,
    User
} from "./interfaces";
import axios from 'axios';
import SocketIO from "socket.io";

export function checkGuess(user: User, text:string, room:Room, socket: any, io: any): any{
    let time = Math.floor((Date.now() - room.startStamp)/1000);
    let timePoints = (30-time);

    if(!user.guessedTitle && room.isSongPlaying){
        let guess = validateGuess(text, room.currentSong.name, 20, 30);
        if(guess == 1){
            let positionPoints = room.users.length - room.titleCount;
            room.titleCount++;
            let points = positionPoints+timePoints;
            user.addPoints(points);
            user.guessedTitle = true;
            const correctGuess: IGuessedCorrect = {username:user.name, type:"title", points:points};
            io.in(room.roomName).emit('user-guessed-correct', correctGuess);
            const guessInfo:IGuessInfo = {type:"title", isCorrect:true, text:text, correctValue:room.currentSong.name};
            socket.emit('guess-info', guessInfo);
            return;
        }
        else if(guess == 2){
            const guessInfo:IGuessInfo = {type:"title", isCorrect:false, text:text, correctValue:""};
            socket.emit('guess-info', guessInfo);
            return;
        }
    }
    else if(!user.guessedIntrepret && room.isSongPlaying){
        let guess = validateGuess(text, room.currentSong.interpret[0], 20, 30);
        if(guess == 1){
            let positionPoints = room.users.length - room.artistCount;
            room.artistCount++;
            let points = positionPoints+timePoints;
            user.addPoints(points);
            user.guessedIntrepret = true;
            const correctGuess:IGuessedCorrect = {username:user.name, type:"artist", points:points};
            io.in(room.roomName).emit('user-guessed-correct', correctGuess);
            const guessInfo:IGuessInfo = {type:"artist", isCorrect:true, text:text, correctValue:room.currentSong.interpret[0]};
            socket.emit('guess-info', guessInfo);
            return;
        }
        else if(guess == 2){
            const guessInfo:IGuessInfo = {type:"artist", isCorrect:false, text:text, correctValue:""};
            socket.emit('guess-info', guessInfo);
            return;
        }
    }
    else{
        let chat:IChat = {text:text, username:user.name};
        io.in(room.roomName).emit('chat', chat);
    }
}
export async function getSongs(playlists: IPlaylistSingle[]): Promise<Song[]>{
    let val: Song[] = new Array();
    const apiClient = axios.create({
        baseURL: 'http://api.deezer.com/',
        responseType: 'json',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    for(let i = 0; i < playlists.length; i++){
        const response = await apiClient.get<IPlaylistSongs>('/playlist/' + playlists[i].id + '/tracks');
        const tempSongs: IPlaylistSongs = response.data;
        /*
        while(tempSongs.next != ""){
            const nextApiClient = axios.create({
                baseURL: tempSongs.next,
                responseType: 'json',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const response = await apiClient.get<IPlaylistSongs>('/playlist/' + playlists[i].id + '/tracks');
            const tempSongs: IPlaylistSongs = response.data;
        }
         */
        console.log('Index: ' + i + ' | Length -> ' + tempSongs.data.length);
        tempSongs.data.forEach( s => val.push(new Song(s.id, s.title_short, [s.artist.name], s.preview, s.album.title)))
        await delay(50);
    }

    console.log("Länge lan: " + val.length);
    return val.filter(function(elem, index, self) {return index === self.indexOf(elem);})
}
export function randomString(length:number):string {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function validateGuess(guess:string, correct:string, percent:number, percentClose:number) : number{
    //percent -> 20 = 20% etc
    guess = formatString(guess);
    correct = formatString(correct);

    console.log("Checking " + guess + " | For: " + correct);
    percent = percent / 100.0;
    percentClose = percentClose / 100.0;

    let subs: string[] = guess.split(' ');
    for(let i = 0; i < subs.length; i++){
        for(let j = i; j < subs.length; j++){
            let sub: string = "";
            for(let x = i; x <= j; x++){
                sub = sub + subs[x];
                if(x < j)
                    sub = sub + " ";
            }

            var count = levenshtein(sub,correct);
            if(count === 0){
                return 1;
            }
            else if(count / correct.length < percentClose){
                return 2;
            }
        }
    }
    return 0;
}

export function removeUserGlobal(id:string, rooms:Room[]){
    rooms.forEach(function(room){
       let index:number = room.users.findIndex( user => user.id == id);
       if(index != -1){
           room.users.splice(index,1);
           return;
       }
    });
}

export function getUsername(username:string, users:User[]):string{
    let name = username;
    for(let i = 1; i < 999; i++){
        let tempUsr = users.find(user => user.name == name);
        if(tempUsr === undefined){
            return name;
        }
        else{
            name = username + " (" + i + ")";
        }
    }
    return "";
}

function levenshtein(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0)
    {
        return bn;
    }
    if (bn === 0)
    {
        return an;
    }
    const matrix = new Array<number[]>(bn + 1);
    for (let i = 0; i <= bn; ++i)
    {
        let row = matrix[i] = new Array<number>(an + 1);
        row[0] = i;
    }
    const firstRow = matrix[0];
    for (let j = 1; j <= an; ++j)
    {
        firstRow[j] = j;
    }
    for (let i = 1; i <= bn; ++i)
    {
        for (let j = 1; j <= an; ++j)
        {
            if (b.charAt(i - 1) === a.charAt(j - 1))
            {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else
            {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1], // substitution
                    matrix[i][j - 1], // insertion
                    matrix[i - 1][j] // deletion
                ) + 1;
            }
        }
    }
    return matrix[bn][an];
};

function removeSub(s:string, start:string, end:string) :string{
    let index1:number = s.indexOf(start);
    let index2:number = s.indexOf(end);
    if(index1 < index2 && index1 != -1){
        let subStr:string = s.slice(index1,index2+1);
        s = s.replace(subStr, "");
    }

    return s;
}

function removeEnd(s:string, sub:string):string{
    let index1:number = s.indexOf(sub);
    if(index1 != -1){
        let subStr:string = s.slice(index1,s.length);
        s.replace(subStr, "");
    }
    return s;
}

export function formatString(s:string):string{

    s = s.toLowerCase();

    s = s.replace("<3","");
    s = s.replace("und","&");
    s = s.replace("'","");
    s = s.replace("!","");
    s = s.replace("?","");
    s = s.replace("-","");
    s = s.replace(".","");
    s = s.replace("/","");
    s = s.replace("|","");
    s = s.replace("$","s");
    s = s.replace("€","e");
    s = s.replace("@","a");
    s = s.replace("~","");
    s = s.replace("#","");
    s = s.replace("+","");
    s = s.replace("`","");
    s = s.replace("´","");
    s = s.replace("%","");
    s = s.replace("§","");
    s = s.replace("\"","");
    s = s.replace("=","");
    s = s.replace("<","");
    s = s.replace("|","");
    s = s.replace(";","");
    s = s.replace(",","");

    s = s.replace("ä","a");
    s = s.replace("ä","a");
    s = s.replace("ä","a");
    s = s.replace("ä","a");
    s = s.replace("ä","a");


    s = s.replace("e","e");
    s = s.replace("e","e");
    s = s.replace("e","e");
    s = s.replace("e","e");
    s = s.replace("e","e");

    // ėêëèé
    // ūùúûü
    // ōøõœóòôö
    // æãåāäâàá
    // šßś
    // ñń
    // îíì

    //TODO testen
    s = removeSub(s, "(", ")");
    s = removeSub(s, "[", "]");
    s = removeSub(s, "{", "}");

    //s = removeEnd(s, "ft");
    //s = removeEnd(s, "feat");
    //s = removeEnd(s, "-");

    return s;
}

export async function getRandomSong(songs:Song[]) : Promise<Song>{
    const number = Math.floor(Math.random() * songs.length);
    const song: Song = songs[number];
    songs.splice(number,1);
    return song;
}

export function getRoomIndex(rooms:Room[], name:string):number{
    for(var i = 0; i < rooms.length; i++){
        if(rooms[i].roomName == name){
            return i;
        }
    }

    return -1;
}

export function isSamePassword(str1: string, str2: string): boolean {
    if (!str1) {
        str1 = "";
    }
    if (!str2) {
        str2 = "";
    }
    return str1 === str2;
}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export default {

}