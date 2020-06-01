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
}

module.exports = User