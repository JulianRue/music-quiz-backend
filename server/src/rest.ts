import express from 'express';
import bodyParser from 'body-parser';
import db from "./queries";



const app = express();
const port :number  = 3000;
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