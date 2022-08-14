"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerSocket = void 0;
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
class ServerSocket {
    constructor(server) {
        this.StartListeners = (socket) => {
            socket.on('handshake', (callback) => {
                var _a;
                const userId = socket.handshake.query.userId;
                const reconnected = Object.values(this.users).some((user) => user.socketId === socket.id);
                if (reconnected) {
                    const uid = this.GetUidFromSocketID(socket.id);
                    const users = Object.values(this.users);
                    if (uid) {
                        callback(uid, users);
                        return;
                    }
                }
                let uid = userId;
                if (!uid) {
                    uid = (0, uuid_1.v4)();
                }
                if ((_a = this.users[uid]) === null || _a === void 0 ? void 0 : _a.socketId) {
                    this.users[uid].socketId = socket.id;
                    this.users[uid].userId = uid;
                }
                else {
                    this.users = Object.assign(Object.assign({}, this.users), { [uid]: {
                            socketId: socket.id,
                            userId: uid,
                            name: "",
                        } });
                }
                const users = Object.values(this.users);
                callback(uid, users);
                this.SendMessage('user_connected', users.filter((user) => user.socketId !== socket.id), users);
            });
            socket.on('disconnect', () => {
                const uid = this.GetUidFromSocketID(socket.id);
                if (uid) {
                    delete this.users[uid];
                    const users = Object.values(this.users);
                    this.SendMessage('user_disconnected', users, uid);
                }
            });
            socket.on("set_name", (data) => {
                if (this.users[data.userId]) {
                    this.users[data.userId].name = data.name;
                    const users = Object.values(this.users);
                    this.SendMessage('user_setname', users, {
                        users: users,
                        userId: data.userId,
                        name: data.name
                    });
                }
            });
            socket.on("push_bell", (data) => {
                if (this.users[data.userId]) {
                    const users = Object.values(this.users);
                    this.SendMessage('user_push_bell', users, {
                        users: users,
                        userId: data.userId,
                    });
                }
            });
        };
        this.GetUidFromSocketID = (id) => {
            return Object.keys(this.users).find((uid) => this.users[uid].socketId === id);
        };
        this.SendMessage = (name, users, payload) => {
            users.forEach((user) => (payload ? this.io.to(user.socketId).emit(name, payload) : this.io.to(user.socketId).emit(name)));
        };
        this.SendSingleMessage = (name, userId, payload) => {
            payload
                ? this.io.to(this.users[userId].socketId).emit(name, payload)
                : this.io.to(this.users[userId].socketId).emit(name);
        };
        this.SetSong = (position, status) => {
            this.io.emit("set_song", JSON.stringify({
                position: position,
                status: status
            }));
        };
        this.ControlSong = (status) => {
            this.io.emit("control_song", JSON.stringify({
                status: status
            }));
        };
        ServerSocket.instance = this;
        this.users = {};
        this.io = new socket_io_1.Server(server, {
            serveClient: false,
            pingInterval: 10000,
            pingTimeout: 5000,
            cookie: false,
            cors: {
                origin: '*'
            }
        });
        this.io.on('connect', this.StartListeners);
        console.log("Socket IO started.");
    }
}
exports.ServerSocket = ServerSocket;
