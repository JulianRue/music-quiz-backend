class User {
    constructor(name, room) {
        this.name = name;
        this.room = room;
        this.points = 0;
    }

    addPoints(points) {
        this.points += points;
    }

    getPoints(){
        return this.points;
    }

    getName(){
        return this.name;
    }

    getRoom(){
        return this.room;
    }
}

module.exports = User