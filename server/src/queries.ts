import { Client, Query } from 'pg';
import {Request, Response} from 'express'
const fs = require('fs');
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

async function getPlaylistSongsFromIds(playlistIds : number[]): Promise<string[]>{
    const query = {
        text: 'SELECT songid FROM songlist WHERE playlistId = ANY ($1)',
        values: [playlistIds],
    };
    client.query(query);
    const res = await client.query(query);
    const data: string[] = new Array();
    res.rows.forEach(entry => data.push(entry.songid));

    return data;
}

//addPlaylist();
async function addPlaylist(){
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

    let temppp = await client.query("SELECT * FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2", [playlistName, creatorName]);
    if(temppp.rows.length == 0)
        client.query('INSERT INTO playlist(name, description, creatorname, country, popularity) VALUES($1, $2, $3, $4, $5)', [playlistName, playlistName +" playlist", creatorName, "DE", 0]);

    const tempPlaylistId = await client.query('SELECT id FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2', [playlistName,creatorName]);
    let playlistId = tempPlaylistId.rows[0].id;

    client.query('DELETE FROM songlist WHERE playlistid = $1', [playlistId]);

    for(let i = 0; i < tempPlaylist.tracks.data.length; i++) {
        client.query('INSERT INTO songlist(songid, playlistid) VALUES($1,$2)', [tempPlaylist.tracks.data[i].id, playlistId]);
    }//
}

//createPlaylist();
async function createPlaylist(){
    let rawData = fs.readFileSync('C:/Users/Julian/Downloads/top100-german-infos.json');
    let tempPlaylist = JSON.parse(rawData);
    let playlistName = "Top 100 Deutschland";
    let creatorName = "admin";

    let temppp = await client.query("SELECT * FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2", [playlistName, creatorName]);
    if(temppp.rows.length == 0)
        client.query('INSERT INTO playlist(name, description, creatorname, country, popularity) VALUES($1, $2, $3, $4, $5)', [playlistName, "Top100 Germany playlist", creatorName, "DE", 0]);

    const tempPlaylistId = await client.query('SELECT id FROM playlist WHERE name LIKE $1 AND creatorname LIKE $2', [playlistName,creatorName]);
    let playlistId = tempPlaylistId.rows[0].id;

    for(let i = 0; i < tempPlaylist.length; i++){
        let tempSongId = await client.query('SELECT id FROM song WHERE url LIKE $1', [tempPlaylist[i].results[0].previewUrl]);
        if(tempSongId.rows.length == 0){
            client.query('INSERT INTO song(name, interpret, url, genre, album) VALUES($1, $2, $3, $4, $5)',
                [tempPlaylist[i].results[0].trackName, tempPlaylist[i].results[0].artistName, tempPlaylist[i].results[0].previewUrl,
                    tempPlaylist[i].results[0].primaryGenreName, tempPlaylist[i].results[0].collectionName]);

            tempSongId = await client.query('SELECT id FROM song WHERE url LIKE $1', [tempPlaylist[i].results[0].previewUrl]);
        }
        else{
            console.log(tempPlaylist[i].results[0].trackName + " " + tempPlaylist[i].results[0].artistName + " is already saved!");
        }

        let songId = tempSongId.rows[0].id;

        let testIndex = await client.query('SELECT * FROM songlist WHERE songid = $1 AND playlistid = $2', [songId,playlistId]);
        if(testIndex.rows.length == 0)
            client.query('INSERT INTO songlist(songid, playlistid) VALUES($1,$2)', [songId, playlistId]);
        else
            console.log(tempPlaylist[i].results[0].trackName + " " + tempPlaylist[i].results[0].artistName + " is already in playlist no " + playlistId);
    }


}
export default {
    getPlaylists: getPlaylists,
    getPlaylistSongsById: getPlaylistSongsById,
    getPlaylistSongsByName : getPlaylistSongsByName,
    getPlaylistSongsFromIds : getPlaylistSongsFromIds
}