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
const client = new pg_1.Client({
    user: 'postgres',
    host: 'monalit.de',
    database: 'music_quiz',
    password: '3a90b22a25',
    port: 5432,
});
client.connect();
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
            text: 'SELECT song.* FROM song INNER JOIN songlist ON songlist.songid = song.id WHERE playlistId = ANY ($1)',
            values: [playlistIds],
        };
        client.query(query);
        const res = yield client.query(query);
        return res.rows;
    });
}
exports.default = {
    getPlaylists: getPlaylists,
    getPlaylistSongsById: getPlaylistSongsById,
    getPlaylistSongsByName: getPlaylistSongsByName,
    getPlaylistSongsFromIds: getPlaylistSongsFromIds
};
