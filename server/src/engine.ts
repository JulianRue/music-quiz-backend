import {
    IChat,
    IGuessedCorrect,
    IGuessInfo,
    Room,
    Song,
    User
} from "./interfaces";
import {getLogger} from "log4js";
import { sendPlayerKick, removePlayers, sendChatMessage, sendCorrectGuess } from "./socket";

const rooms: Room[] = [];

const logger = getLogger();

const roomTimeout: number = 1000 * 60 * 30; //30 min

export async function removeIdleRooms() {
    while (true) {
        const now = Date.now();
        rooms.forEach(room => {
            if((room.status === 'lobby' || room.status === 'endscreen')
                && now - room.createTime > roomTimeout) {
                const index = rooms.indexOf(room);
                if(index > -1) {
                    sendPlayerKick(room.roomName);
                    removePlayers(room);
                    rooms.splice(index, 1);
                    logger.info(`room "${room.roomName}" timed out`);
                }
            }
        });
        await delay(10000);
    }
}

export function checkGuess(user: User, text:string, room:Room, socket: any) {
    let time = Math.floor((Date.now() - room.startStamp)/1000);
    let timePoints = (30-time);

    let chatMessage = '' + text;

    let guessed:boolean = false;
    if(!user.guessedTitle && room.isSongPlaying){
        let guess = validateGuess(text, [room.currentSong.name], 20, 30);
        if(guess == 1){
            let positionPoints = room.users.length - room.titleCount;
            room.titleCount++;
            let points = positionPoints+timePoints;
            user.addPoints(points);
            user.guessedTitle = true;
            const correctGuess: IGuessedCorrect = {username:user.name, type:"title", points:points};
            sendCorrectGuess(room.roomName, correctGuess);
            const guessInfo: IGuessInfo = {type:"title", isCorrect:true, text:text, correctValue:[room.currentSong.name]};
            socket.emit('guess-info', guessInfo);
            if(user.guessedIntrepret){
                socket.emit('guess-picture', room.currentSong.cover_medium);
            }
            guessed = true;
        }
        else if(guess == 2){
            const guessInfo:IGuessInfo = {type:"title", isCorrect:false, text:text, correctValue:[]};
            socket.emit('guess-info', guessInfo);
            guessed = true;
        }
    }

    if(!user.guessedIntrepret && room.isSongPlaying){
        let guess = validateGuess(text, room.currentSong.interpret, 20, 30);
        if(guess == 1){
            let positionPoints = room.users.length - room.artistCount;
            room.artistCount++;
            let points = positionPoints+timePoints;
            user.addPoints(points);
            user.guessedIntrepret = true;
            const correctGuess:IGuessedCorrect = {username:user.name, type:"artist", points:points};
            sendCorrectGuess(room.roomName, correctGuess);
            const guessInfo:IGuessInfo = {type:"artist", isCorrect:true, text:text, correctValue:room.currentSong.interpret};
            socket.emit('guess-info', guessInfo);
            if(user.guessedTitle){
                socket.emit('guess-picture', room.currentSong.cover_medium);
            }
            guessed = true;
        }
        else if(guess == 2){
            const guessInfo:IGuessInfo = {type:"artist", isCorrect:false, text:text, correctValue:[]};
            socket.emit('guess-info', guessInfo);
            guessed = true;
        }
    }

    if(!guessed){
        const chat: IChat = {text:chatMessage, username:user.name};
        sendChatMessage(room.roomName, chat);
    }
}

export function validateGuess(guess:string, corrects:string[], percent:number, percentClose:number) : number{
    //percent -> 20 = 20% etc
    guess = formatString(guess);
    percent = percent / 100.0;
    percentClose = percentClose / 100.0;
    let points: number = 0;
    let subs: string[] = guess.split(' ');

    corrects.forEach(correct => {
        correct = formatString(correct);
        correct = correct.split(' ').join('');


        for(let i = 0; i < subs.length && points != 1; i++){
            for(let j = i; j < subs.length  && points != 1; j++){
                let sub: string = "";
                for(let x = i; x <= j; x++){
                    sub = sub + subs[x];
                }
                var count = levenshtein(sub,correct);
                if(count === 0){
                    points = 1;
                    break;
                }
                else if(count / correct.length < percentClose){
                    points = 2;
                }
            }
        }
    });

    return points;
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

export function formatString(s:string):string{

    s = s.toLowerCase();

    s = s.replace(/<3/g,"");
    s = s.replace(/ß/g,"ss");
    s = s.replace(/und/g,"&");
    s = s.replace(/and/g,"&");
    s = s.replace(/'/g,"");
    s = s.replace(/!/g,"");
    s = s.replace(/\?/g,"");
    s = s.replace(/-/g,"");
    s = s.replace(/\./g,"");
    s = s.replace(/\//g,"");
    s = s.replace(/\|/g,"");
    s = s.replace(/$/g,"s");
    s = s.replace(/€/g,"e");
    s = s.replace(/@/g,"a");
    s = s.replace(/~/g,"");
    s = s.replace(/#/g,"");
    s = s.replace(/\+/g,"");
    s = s.replace(/`/g,"");
    s = s.replace(/´/g,"");
    s = s.replace(/%/g,"");
    s = s.replace(/§/g,"");
    s = s.replace(/"/g,"");
    s = s.replace(/=/g,"");
    s = s.replace(/</g,"");
    s = s.replace(/|/g,"");
    s = s.replace(/\*/g,"");
    s = s.replace(/;/g,"");
    s = s.replace(/,/,"");

    s = s.replace(/æ/g,"a");
    s = s.replace(/ã/g,"a");
    s = s.replace(/å/g,"a");
    s = s.replace(/ā/g,"a");
    s = s.replace(/ä/g,"a");
    s = s.replace(/ä/g,"a");
    s = s.replace(/â/g,"a");
    s = s.replace(/à/g,"a");
    s = s.replace(/á/g,"a");


    s = s.replace(/ė/g,"e");
    s = s.replace(/ê/g,"e");
    s = s.replace(/ë/g,"e");
    s = s.replace(/è/g,"e");
    s = s.replace(/é/g,"e");


    s = s.replace(/ū/g,"u");
    s = s.replace(/ù/g,"u");
    s = s.replace(/ú/g,"u");
    s = s.replace(/è/g,"u");
    s = s.replace(/û/g,"u");
    s = s.replace(/ü/g,"u");


    s = s.replace(/ō/g,"o");
    s = s.replace(/ø/g,"o");
    s = s.replace(/õ/g,"o");
    s = s.replace(/œ/g,"o");
    s = s.replace(/ó/g,"o");
    s = s.replace(/ò/g,"o");
    s = s.replace(/ô/g,"o");
    s = s.replace(/ö/g,"o");

    s = s.replace(/î/g,"i");
    s = s.replace(/í/g,"i");
    s = s.replace(/ì/g,"i");

    s = s.replace(/š/g,"s");
    s = s.replace(/ś/g,"s");

    s = s.replace(/ñ/g,"n");
    s = s.replace(/ń/g,"n");

    s = removeSub(s, "(", ")");
    s = removeSub(s, "[", "]");
    s = removeSub(s, "{", "}");

    return s;
}

export function getRandomSong(songs: Song[]): Song{
    const val: number = Math.floor(Math.random() * songs.length);
    const song: Song = songs[val];
    songs = songs.splice(val,1);
    return song;
}

export function getRoomIndex(name:string):number{
    for(var i = 0; i < rooms.length; i++){
        if(rooms[i].roomName == name){
            return i;
        }
    }
    return -1;
}

export function getRoomByIndex(index: number): Room {
    return rooms[index];
}

export function addNewRoom(room: Room): number {
    return (rooms.push(room) - 1);
}

export function removeRoom(index: number) {
    rooms.splice(index, 1);
}

export function getRoom(name:string): Room | undefined{
    for(var i = 0; i < rooms.length; i++){
        if(rooms[i].roomName == name){
            return rooms[i];
        }
    }
    return undefined;
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