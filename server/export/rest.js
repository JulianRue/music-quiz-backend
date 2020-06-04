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
exports.port = 3000;
console.log("Started rest");
exports.app.use(body_parser_1.default.json());
exports.app.use(body_parser_1.default.urlencoded({
    extended: true,
}));
exports.app.get('/api/', (request, response) => {
    response.json({ info: 'Node.js, Express, REST, and Postgres API' });
});
exports.app.get('/api/playlist/:count', queries_1.default.getPlaylists);
exports.app.get('/api/playlist/id/:id', queries_1.default.getPlaylistSongsById);
exports.app.get('/api/playlist/user/:name', queries_1.default.getPlaylistSongsByName);
exports.app.listen(exports.port, () => {
    console.log(`REST Interface is running on port ${exports.port}.`);
});
function run() {
}
exports.default = {};
