class User {

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

export default {
    User: User
}