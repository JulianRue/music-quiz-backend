import express, {Response} from 'express';
import bodyParser from 'body-parser';

export const app = express();

const https = require("https"),
    fs = require("fs");

const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/songclasher.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/songclasher.com/fullchain.pem")
};

var cors = require('cors');

var originsWhitelist = [
    'http://localhost:4200',
    'https://songclasher.com/',
    'https://songclasher.com',
  ];


var corsOptions = {
    origin: function(origin: any, callback: any){
          var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
          callback(null, isWhitelisted);
    }
  }
  app.use(cors(corsOptions));


export const port :number  = 3000;

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.get('/api/', (request, response) => {
    response.json({ info: 'Node.js, Express, REST, and Postgres API' })
});

//app.get('/api/playlist/:count', keycloak.protect('user', 'admin'), db.getPlaylists);
//app.get('/api/playlist/id/:id', keycloak.protect('user', 'admin') ,db.getPlaylistSongsById);
//app.get('/api/playlist/user/:name', keycloak.protect('user', 'admin'), db.getPlaylistSongsByName);
//app.post('/api/playlist/', keycloak.protect('user', 'admin'), db.createPlaylist);

app.get('/api/time', function (request: any, res : Response) {
    res.status(200).send("" + Date.now());
});

/*
app.listen(port, () => {
    console.log(`http REST Interface is running on port ${port}.`)
});
*/

https.createServer(options, app).listen(port, () => {
    console.log(`REST Interface is running on port ${port}.`);
});

export default {}