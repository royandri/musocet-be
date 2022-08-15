import { Server as HttpServer } from "http";
import { Socket, Server } from "socket.io";
import { v4 } from "uuid";

type User = {
  socketId: string;
  userId: string;
  name: string;
  score: number;
};

export class ServerSocket {
  public static instance: ServerSocket;
  public io: Server;

  /** Master list of all connected users */
  public users: { [uid: string]: User };

  constructor(server: HttpServer) {
    ServerSocket.instance = this;
    this.users = {};
    this.io = new Server(server, {
      serveClient: false,
      pingInterval: 10000,
      pingTimeout: 5000,
      cookie: false,
      cors: {
        origin: "*",
      },
    });

    this.io.on("connect", this.StartListeners);
    console.log("Socket IO started.");
  }

  StartListeners = (socket: Socket) => {
    socket.on("handshake", (callback: (uid: string, users: User[]) => void) => {
      const userId = socket.handshake.query.userId;
      const reconnected = Object.values(this.users).some(
        (user) => user.socketId === socket.id
      );

      if (reconnected) {
        const uid = this.GetUidFromSocketID(socket.id);

        const users = Object.values(this.users);

        if (uid) {
          callback(uid, users);
          return;
        }
      }

      let uid = userId as string;
      if (!uid) {
        uid = v4();
      }

      if (this.users[uid]?.socketId) {
        this.users[uid].socketId = socket.id;
        this.users[uid].userId = uid;
      } else {
        this.users = {
          ...this.users,
          [uid]: {
            socketId: socket.id,
            userId: uid,
            name: "",
            score: 0,
          },
        };
      }

      const users = Object.values(this.users);
      callback(uid, users);

      this.SendMessage(
        "user_connected",
        users.filter((user) => user.socketId !== socket.id),
        users
      );
    });

    socket.on("disconnect", () => {
      const uid = this.GetUidFromSocketID(socket.id);

      if (uid) {
        delete this.users[uid];

        const users = Object.values(this.users);

        this.SendMessage("user_disconnected", users, uid);
      }
    });

    socket.on("set_name", (data: { userId: string; name: string }) => {
      if (this.users[data.userId]) {
        this.users[data.userId].name = data.name;
        const users = Object.values(this.users);
        this.SendMessage("user_setname", users, {
          users: users,
          userId: data.userId,
          name: data.name,
        });
      }
    });

    socket.on("push_bell", (data: { userId: string }) => {
      if (this.users[data.userId]) {
        const users = Object.values(this.users);
        this.SendMessage("user_push_bell", users, {
          users: users,
          userId: data.userId,
        });
      }
    });
  };

  GetUidFromSocketID = (id: string) => {
    return Object.keys(this.users).find(
      (uid) => this.users[uid].socketId === id
    );
  };

  SendMessage = (name: string, users: User[], payload?: Object) => {
    users.forEach((user) =>
      payload
        ? this.io.to(user.socketId).emit(name, payload)
        : this.io.to(user.socketId).emit(name)
    );
  };

  SendSingleMessage = (name: string, userId: string, payload?: Object) => {
    payload
      ? this.io.to(this.users[userId].socketId).emit(name, payload)
      : this.io.to(this.users[userId].socketId).emit(name);
  };

  SetSong = (position: string, status: string) => {
    this.io.emit(
      "set_song",
      JSON.stringify({
        position: position,
        status: status,
      })
    );
  };

  ControlSong = (status: string) => {
    this.io.emit(
      "user_control_song",
      JSON.stringify({
        status: status,
      })
    );
  };

  SetScore = (userId: string, score: number) => {
    this.users[userId].score += score;
    const users = Object.values(this.users);
    this.io.emit(
      "set_score",
      JSON.stringify({
        userId: userId,
        users: users,
        score: this.users[userId].score,
      })
    );
  };
}
