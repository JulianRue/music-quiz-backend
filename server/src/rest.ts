import express from 'express';
import bodyParser from 'body-parser';
import db from "./queries";

export const app = express();


const Keycloak =  require("keycloak-connect");
var session = require('express-session');
var memoryStore =  new  session.MemoryStore();
var keycloak =  new  Keycloak({ store: memoryStore });
app.use(session({
    secret: '284dd0d2-1bfd-4278-940b-4badb994bdc0',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));
app.use(keycloak.middleware());

/*
const keycloak = require('../config/keycloak-config.js').initKeycloak();
app.use(keycloak.middleware());
*/
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

app.get('/api/playlist/:count', keycloak.protect('user', 'admin'), db.getPlaylists);
app.get('/api/playlist/id/:id', keycloak.protect('user', 'admin') ,db.getPlaylistSongsById);
app.get('/api/playlist/user/:name', keycloak.protect('user', 'admin'), db.getPlaylistSongsByName);

app.listen(port, () => {
    console.log(`REST Interface is running on port ${port}.`)
});

function run(){

}



export default {}