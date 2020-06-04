import express from 'express';
import bodyParser from 'body-parser';
import db from "./queries";

export const app = express();
export const port :number  = 3000;
console.log("Started rest");

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

function run(){

}

export default {}