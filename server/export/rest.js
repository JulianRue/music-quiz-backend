"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.port = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const queries_1 = __importDefault(require("./queries"));
exports.app = express_1.default();
const https = require("https"), fs = require("fs");
/*
const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/monalit.de/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/monalit.de/fullchain.pem")
};
 */
const Keycloak = require("keycloak-connect");
var session = require('express-session');
var cors = require('cors');
var memoryStore = new session.MemoryStore();
var keycloak = new Keycloak({ store: memoryStore });
exports.app.use(session({
    secret: '284dd0d2-1bfd-4278-940b-4badb994bdc0',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));
exports.app.use(keycloak.middleware());
var originsWhitelist = [
    'http://localhost:4200',
    'http://monalit.de/musicquiz/',
    'https://monalit.de/musicquiz/',
    'http://monalit.de/',
    'https://monalit.de/',
    'http://monalit.de',
    'https://monalit.de',
];
var corsOptions = {
    origin: function (origin, callback) {
        var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
        callback(null, isWhitelisted);
    }
};
exports.app.use(cors(corsOptions));
/*
const keycloak = require('../config/keycloak-config.js').initKeycloak();
app.use(keycloak.middleware());
*/
exports.port = 3000;
console.log("Started rest");
exports.app.use(body_parser_1.default.json());
exports.app.use(body_parser_1.default.urlencoded({
    extended: true,
}));
exports.app.get('/api/', (request, response) => {
    response.json({ info: 'Node.js, Express, REST, and Postgres API' });
});
exports.app.get('/api/playlist/:count', keycloak.protect('user', 'admin'), queries_1.default.getPlaylists);
exports.app.get('/api/playlist/id/:id', keycloak.protect('user', 'admin'), queries_1.default.getPlaylistSongsById);
exports.app.get('/api/playlist/user/:name', keycloak.protect('user', 'admin'), queries_1.default.getPlaylistSongsByName);
exports.app.post('/api/playlist/', keycloak.protect('user', 'admin'), queries_1.default.createPlaylist);
exports.app.listen(exports.port, () => {
    console.log(`REST Interface is running on port ${exports.port}.`);
});
function run() {
}
//https.createServer(options, app).listen(3001);
exports.default = {};
