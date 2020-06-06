import {Room, Song, User} from "./interfaces";

export function levenshtein(a: string, b: string): number {
    a = formatString(a);
    b = formatString(b);
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
    s = s.replace("'","");

    s = removeSub(s, "(", ")");
    s = removeSub(s, "[", "]");
    s = removeSub(s, "{", "}");

    s = removeEnd(s, "ft.");
    s = removeEnd(s, "feat.");
    s = removeEnd(s, "-");

    return s;
}

export function getRandomSong(songs:Song[]) : Song{
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number,1);
    return json;
}

export function getRoomIndex(rooms:Room[], name:string):number{
    for(var i = 0; i < rooms.length; i++){
        if(rooms[i].roomName == name){
            return i;
        }
    }

    return -1;
}

export function removeUser(users: User[], username: string): User[] {
    let spliced = false;
    for(let i = 0; i < users.length && !spliced; i++) {
        if(users[i].name === username) {
            users.splice(i, 1);
            spliced = true;
        }
    }
    return users;
}

export function getUsersInRoom(rooms: Room[], roomName: string): User[] {
    let index = getRoomIndex(rooms, roomName);
    return rooms[index].getUsers();
}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export default {

}