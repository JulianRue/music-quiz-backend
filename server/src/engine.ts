import {Room, Song, User} from "./interfaces";

export function validateGuess(guess:string){

}

export function getRandomSong(songs:Song[]){
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number,1);
    return json;
}

export function getRoomIndex(rooms:Room[], name:string){
    for(var i = 0; i < rooms.length; i++){
        if(rooms[i].roomName == name){
            return i;
        }
    }

    return -1;
}

export function removeUser(users:User[], username:string){
    for(var i = 0; i < User.length; i++){
        if(users[i].name == username){
            users.splice(i,1);
            return true;
        }
    }
    return false;
}
export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export default {
    validateGuess
}