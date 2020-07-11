"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fs = require('fs');
const client = new pg_1.Client({
    user: 'postgres',
    host: 'monalit.de',
    database: 'music_quiz',
    password: '3a90b22a25',
    port: 5432,
});
client.connect();
function createPlaylist(request, response) {
    let username = request.kauth.grant.access_token.content.preferred_username;
    let name = request.body.name;
    let description = request.body.description;
    let country = request.body.country;
    console.log("Create called!");
    console.log("username: " + username);
    console.log("name: " + name);
    console.log("description: " + description);
    console.log("country: " + country);
    client.query('INSERT INTO playlist(name, description, creatorname, country, popularity) VALUES($1, $2, $3, $4, $5)', [name, description, username, country, 0]);
    let result = client.query("SELECT * FROM playlist WHERE creatorname LIKE $1", [username], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}
function getPlaylists(request, response) {
    const query = {
        text: 'SELECT * FROM playlist ORDER BY popularity DESC LIMIT $1',
        values: [request.params.count],
    };
    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}
;
function getPlaylistSongsById(request, response) {
    const query = {
        text: 'SELECT DISTINCT * FROM song INNER JOIN songlist ON songlist.songid = song.id WHERE playlistid = $1',
        values: [request.params.id],
    };
    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}
;
function getPlaylistSongsByName(request, response) {
    const query = {
        text: 'SELECT DISTINCT * FROM playlist WHERE creatorname LIKE $1 ORDER BY popularity DESC',
        values: [request.params.name],
    };
    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}
;
function getPlaylistSongsFromIds(playlistIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = {
            text: 'SELECT songid FROM songlist WHERE playlistId = ANY ($1)',
            values: [playlistIds],
        };
        client.query(query);
        const res = yield client.query(query);
        const data = new Array();
        res.rows.forEach(entry => data.push(entry.songid));
        return data;
    });
}
//addStaticPlaylist();
function addStaticPlaylist() {
    return __awaiter(this, void 0, void 0, function* () {
        /*
        let rawData = fs.readFileSync('C:/Users/Julian/Downloads/1111143121.json');
        let tempPlaylist = JSON.parse(rawData);
        let playlistName = "Top 100 Deutschland";
        let creatorName = "admin";
        */
        let rawData = fs.readFileSync('C:/Users/Julian/Downloads/146820791.json');
        let tempPlaylist = JSON.parse(rawData);
        let playlistName = "HYPED HIPHOP/RAP Deutschland";
        let creatorName = "admin";
        let temppp = yield client.query("SELECT * FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2", [playlistName, creatorName]);
        if (temppp.rows.length == 0)
            client.query('INSERT INTO playlist(name, description, creatorname, country, popularity) VALUES($1, $2, $3, $4, $5)', [playlistName, playlistName + " playlist", creatorName, "DE", 0]);
        const tempPlaylistId = yield client.query('SELECT id FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2', [playlistName, creatorName]);
        let playlistId = tempPlaylistId.rows[0].id;
        client.query('DELETE FROM songlist WHERE playlistid = $1', [playlistId]);
        for (let i = 0; i < tempPlaylist.tracks.data.length; i++) {
            client.query('INSERT INTO songlist(songid, playlistid) VALUES($1,$2)', [tempPlaylist.tracks.data[i].id, playlistId]);
        } //
    });
}
//createStaticPlaylist();
function createStaticPlaylist() {
    return __awaiter(this, void 0, void 0, function* () {
        let rawData = fs.readFileSync('C:/Users/Julian/Downloads/top100-german-infos.json');
        let tempPlaylist = JSON.parse(rawData);
        let playlistName = "Top 100 Deutschland";
        let creatorName = "admin";
        let temppp = yield client.query("SELECT * FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2", [playlistName, creatorName]);
        if (temppp.rows.length == 0)
            client.query('INSERT INTO playlist(name, description, creatorname, country, popularity) VALUES($1, $2, $3, $4, $5)', [playlistName, "Top100 Germany playlist", creatorName, "DE", 0]);
        const tempPlaylistId = yield client.query('SELECT id FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2', [playlistName, creatorName]);
        let playlistId = tempPlaylistId.rows[0].id;
        for (let i = 0; i < tempPlaylist.length; i++) {
            let tempSongId = yield client.query('SELECT id FROM song WHERE url LIKE $1', [tempPlaylist[i].results[0].previewUrl]);
            if (tempSongId.rows.length == 0) {
                client.query('INSERT INTO song(name, interpret, url, genre, album) VALUES($1, $2, $3, $4, $5)', [tempPlaylist[i].results[0].trackName, tempPlaylist[i].results[0].artistName, tempPlaylist[i].results[0].previewUrl,
                    tempPlaylist[i].results[0].primaryGenreName, tempPlaylist[i].results[0].collectionName]);
                tempSongId = yield client.query('SELECT id FROM song WHERE url LIKE $1', [tempPlaylist[i].results[0].previewUrl]);
            }
            else {
                console.log(tempPlaylist[i].results[0].trackName + " " + tempPlaylist[i].results[0].artistName + " is already saved!");
            }
            let songId = tempSongId.rows[0].id;
            let testIndex = yield client.query('SELECT * FROM songlist WHERE songid = $1 AND playlistid = $2', [songId, playlistId]);
            if (testIndex.rows.length == 0)
                client.query('INSERT INTO songlist(songid, playlistid) VALUES($1,$2)', [songId, playlistId]);
            else
                console.log(tempPlaylist[i].results[0].trackName + " " + tempPlaylist[i].results[0].artistName + " is already in playlist no " + playlistId);
        }
    });
}
exports.default = {
    getPlaylists: getPlaylists,
    getPlaylistSongsById: getPlaylistSongsById,
    getPlaylistSongsByName: getPlaylistSongsByName,
    getPlaylistSongsFromIds: getPlaylistSongsFromIds,
    createPlaylist: createPlaylist
};
