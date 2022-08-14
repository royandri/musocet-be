"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const socket_1 = require("./socket");
const application = (0, express_1.default)();
/** Server Handling */
const httpServer = http_1.default.createServer(application);
/** Start Socket */
new socket_1.ServerSocket(httpServer);
/** Log the request */
application.use((req, res, next) => {
    console.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);
    res.on('finish', () => {
        console.info(`METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
    });
    next();
});
/** Parse the body of the request */
application.use(express_1.default.urlencoded({ extended: true }));
application.use(express_1.default.json());
/** Rules of our API */
application.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method == 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});
application.post('/set_song', (req, res, next) => {
    const song_position = req.query.position;
    const song_status = req.query.status;
    socket_1.ServerSocket.instance.SetSong(song_position, song_status);
    return res.status(200).json({ message: 'Success set song status' });
});
application.post('/control_song', (req, res, next) => {
    const song_status = req.query.status;
    socket_1.ServerSocket.instance.ControlSong(song_status);
    return res.status(200).json({ message: 'Success send request stop song' });
});
/** Error handling */
application.use((req, res, next) => {
    const error = new Error('Not found');
    res.status(404).json({
        message: error.message
    });
});
/** Listen */
httpServer.listen(process.env.NODE_ENV === "production" ? 8080 : 5000, () => console.info(`Server is running`));
