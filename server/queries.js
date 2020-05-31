const Client = require('pg').Client;
//const data = require('./data.json');

const client = new Client({
    user: 'postgres',
    host: 'monalit.de',
    database: 'music_quiz',
    password: '3a90b22a25',
    port: 5432,
})

client.connect();

const getPlaylists = (request, response) => {
    client.query('SELECT * FROM playlist', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};

const getPlaylistSongs = (request, response) => {
    const query = {
        text: 'SELECT * FROM song INNER JOIN songlist ON songlist.songid = song.id WHERE playlistid = $1',
        values: [request.params.id],
    };

    client.query(query, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};













/*
    MISC
 */
function addSongsHARDCODED(){
    for(var i = 0; i < data.length; i++){
        const query = {
            text: 'INSERT INTO song(name, interpret, url, genre, album) VALUES($1, $2, $3, $4, $5)',
            values: [data[i]["results"][0]['trackName'], data[i]["results"][0]['artistName'], data[i]["results"][0]['previewUrl'], data[i]["results"][0]['primaryGenreName'], data[i]["results"][0]['collectionName']],
        };
        client.query(query, (err, res) => {
            if (err) {
                console.log(err.stack)
            } else {
                console.log(data[i]["results"][0]['trackName'] + " - " + data[i]["results"][0]['artistName'] + " successfully added!");
            }
        });
    }
}

function addPlaylistsHARDCODED(){
    for(var i = 0; i < data.length; i++){
        var index = 0;
        if(i < data.length / 2.0){
            index = 1;
        }
        else{
            index = 2;
        }

        const query1 = {
            text: 'SELECT id FROM song WHERE url LIKE $1',
            values: [data[i]["results"][0]['previewUrl']],
        };

        client.query(query1, (err, res) => {
            if (err) {
                console.log(err.stack)
            } else {
                var tempId = res.rows[0]['id'];
                console.log("TempId -> " + tempId);

                const query = {
                    text: 'INSERT INTO songlist(songid, playlistid) VALUES ($1, $2)',
                    values: [tempId , index],
                };

                client.query(query, (err, res) => {
                    if (err) {
                        console.log(err.stack)
                    } else {
                        console.log(i + " successfully added to playlist!");
                    }
                })
            }
        });
    }
}

module.exports = {
    getPlaylists, getPlaylistSongs
};

