const Client = require('pg').Client;
const client = new Client({
    user: 'postgres',
    host: 'monalit.de',
    database: 'music_quiz',
    password: '3a90b22a25',
    port: 5432,
})

client.connect();

const getPlaylists = (request, response) => {
    pool.query('SELECT id,name FROM playlist', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    })
};

module.exports = {
    getPlaylists,
};

