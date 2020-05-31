const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const db = require('./queries');
//export {db};

const port = 3000;

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.get('/api/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' })
});

app.get('/api/playlist', db.getPlaylists);
app.get('/api/playlist/:id', db.getPlaylistSongs);

app.listen(port, () => {
    console.log(`REST Interface is running on port ${port}.`)
});

