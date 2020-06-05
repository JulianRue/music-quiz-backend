import { Client, Query } from 'pg';
import {Request, Response} from 'express'
import { request } from 'http';

const client: Client = new Client({
    user: 'postgres',
    host: 'monalit.de',
    database: 'music_quiz',
    password: '3a90b22a25',
    port: 5432,
});

client.connect();

function getPlaylists(request : Request, response : Response) {
    const query = {
        text: 'SELECT * FROM playlist ORDER BY popularity DESC LIMIT $1',
        values: [request.params.count],
    };

    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};



function getPlaylistSongsById(request : Request, response : Response) {
    const query = {
        text: 'SELECT DISTINCT * FROM song INNER JOIN songlist ON songlist.songid = song.id WHERE playlistid = $1',
        values: [request.params.id],
    };

    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};

function getPlaylistSongsByName(request : Request , response : Response) {
    const query = {
        text: 'SELECT DISTINCT * FROM playlist WHERE creatorname LIKE $1 ORDER BY popularity DESC',
        values: [request.params.name],
    };

    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};

async function getPlaylistSongsFromIds(playlistIds : number[]){
    const query = {
        text: 'SELECT song.* FROM song INNER JOIN songlist ON songlist.songid = song.id WHERE playlistId = ANY ($1)',
        values: [playlistIds],
    };

    client.query(query);
    const res = await client.query(query);
    return res.rows;
}

export default {
    getPlaylists: getPlaylists,
    getPlaylistSongsById: getPlaylistSongsById,
    getPlaylistSongsByName : getPlaylistSongsByName,
    getPlaylistSongsFromIds : getPlaylistSongsFromIds
}