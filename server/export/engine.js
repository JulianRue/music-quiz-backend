"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.isSamePassword = exports.getRoomIndex = exports.getRandomSong = exports.formatString = exports.getUsername = exports.removeUserGlobal = exports.validateGuess = exports.randomString = void 0;
function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.randomString = randomString;
function validateGuess(guess, correct, percent, percentClose) {
    //percent -> 20 = 20% etc
    guess = formatString(guess);
    correct = formatString(correct);
    percent = percent / 100.0;
    var count = levenshtein(guess, correct);
    if (count / correct.length < percent) {
        return 1;
    }
    else if (count / correct.length < percentClose) {
        return 2;
    }
    else {
        return 0;
    }
}
exports.validateGuess = validateGuess;
function removeUserGlobal(id, rooms) {
    rooms.forEach(function (room) {
        let index = room.users.findIndex(user => user.id == id);
        if (index != -1) {
            room.users.splice(index, 1);
            return;
        }
    });
}
exports.removeUserGlobal = removeUserGlobal;
function getUsername(username, users) {
    let name = username;
    for (let i = 1; i < 999; i++) {
        let tempUsr = users.find(user => user.name == name);
        if (tempUsr === undefined) {
            return name;
        }
        else {
            name = username + " (" + i + ")";
        }
    }
    return "";
}
exports.getUsername = getUsername;
function levenshtein(a, b) {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) {
        return bn;
    }
    if (bn === 0) {
        return an;
    }
    const matrix = new Array(bn + 1);
    for (let i = 0; i <= bn; ++i) {
        let row = matrix[i] = new Array(an + 1);
        row[0] = i;
    }
    const firstRow = matrix[0];
    for (let j = 1; j <= an; ++j) {
        firstRow[j] = j;
    }
    for (let i = 1; i <= bn; ++i) {
        for (let j = 1; j <= an; ++j) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1], // substitution
                matrix[i][j - 1], // insertion
                matrix[i - 1][j] // deletion
                ) + 1;
            }
        }
    }
    return matrix[bn][an];
}
;
function removeSub(s, start, end) {
    let index1 = s.indexOf(start);
    let index2 = s.indexOf(end);
    if (index1 < index2 && index1 != -1) {
        let subStr = s.slice(index1, index2 + 1);
        s.replace(subStr, "");
    }
    return s;
}
function removeEnd(s, sub) {
    let index1 = s.indexOf(sub);
    if (index1 != -1) {
        let subStr = s.slice(index1, s.length);
        s.replace(subStr, "");
    }
    return s;
}
function formatString(s) {
    s = s.toUpperCase();
    s = s.replace("'", "");
    s = removeSub(s, "(", ")");
    s = removeSub(s, "[", "]");
    s = removeSub(s, "{", "}");
    s = removeEnd(s, "ft.");
    s = removeEnd(s, "feat.");
    s = removeEnd(s, "-");
    return s;
}
exports.formatString = formatString;
function getRandomSong(songs) {
    const number = Math.floor(Math.random() * songs.length);
    const json = songs[number];
    songs.splice(number, 1);
    return json;
}
exports.getRandomSong = getRandomSong;
function getRoomIndex(rooms, name) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomName == name) {
            return i;
        }
    }
    return -1;
}
exports.getRoomIndex = getRoomIndex;
function isSamePassword(str1, str2) {
    if (!str1) {
        str1 = "";
    }
    if (!str2) {
        str2 = "";
    }
    return str1 === str2;
}
exports.isSamePassword = isSamePassword;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
exports.default = {};
