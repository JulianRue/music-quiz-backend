import express from 'express';
import bodyParser from 'body-parser';
import db from "./queries";

export const app = express();

const https = require("https"),
    fs = require("fs");
/*
const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/monalit.de/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/monalit.de/fullchain.pem")
};
 */

const Keycloak =  require("keycloak-connect");
var session = require('express-session');
var cors = require('cors');
var memoryStore =  new  session.MemoryStore();
var keycloak =  new  Keycloak({ store: memoryStore });
app.use(session({
    secret: '284dd0d2-1bfd-4278-940b-4badb994bdc0',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));
app.use(keycloak.middleware());

var originsWhitelist = [
    'http://localhost:4200'
  ];

/*
var corsOptions = {
    origin: function(origin: any, callback: any){
          var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
          callback(null, isWhitelisted);
    }
  }
   
  app.use(cors(corsOptions));
*/
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
app.post('/api/playlist/', keycloak.protect('user', 'admin'), db.createPlaylist);

app.listen(port, () => {
    console.log(`REST Interface is running on port ${port}.`)
});

function run(){

}

//https.createServer(options, app).listen(3001);

export default {}