"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class User {
    constructor(name, room) {
        this.name = name;
        this.room = room;
        this.points = 0;
    }
    addPoints(points) {
        this.points += points;
    }
    removePoints(points) {
        this.points -= points;
    }
}
exports.default = {
    User: User
};
