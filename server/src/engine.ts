import {IMusicEntry, Room, Song, User} from "./interfaces";
import axios from 'axios';

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
    percent = percent / 100.0;
    percentClose = percentClose / 100.0;
    var count = levenshtein(guess,correct);

    if(count === 0){
        return 1;
    }
    else if(count / correct.length < percentClose){
        return 2;
    }
    else{
        return 0;
    }
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
        s.replace(subStr, "");
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
    s = s.toUpperCase();

    s = s.replace("'","");
    s = s.replace("!","");
    s = s.replace("?","");
    s = s.replace("-","");
    s = s.replace(".","");
    s = s.replace("/","");
    s = s.replace("|","");

    s = removeSub(s, "(", ")");
    s = removeSub(s, "[", "]");
    s = removeSub(s, "{", "}");

    //s = removeEnd(s, "ft");
    //s = removeEnd(s, "feat");
    //s = removeEnd(s, "-");

    return s;
}

export async function getRandomSong(songs:string[]) : Promise<Song>{
    const apiClient = axios.create({
        baseURL: 'http://api.deezer.com/',
        responseType: 'json',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const number = Math.floor(Math.random() * songs.length);
    const id = songs[number];
    songs.splice(number,1);
    const response = await apiClient.get<IMusicEntry>('/track/' + id);

    const tempSong: IMusicEntry = response.data;
    const song: Song = new Song(tempSong.id, tempSong.title_short, tempSong.artist.name, tempSong.preview, tempSong.album.title);
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