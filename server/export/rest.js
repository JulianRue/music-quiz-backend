const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const db = require('./queries');

const port = 3000;

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.get('/api/', (request, response) => {
    response.json({ info: 'Node.js, Express, REST, and Postgres API' })
});

app.get('/api/playlist/:count', db.getPlaylists);
app.get('/api/playlist/id/:id', db.getPlaylistSongsById);
app.get('/api/playlist/user/:name', db.getPlaylistSongsByName);

app.listen(port, () => {
    console.log(`REST Interface is running on port ${port}.`)
});

module.exports = db;