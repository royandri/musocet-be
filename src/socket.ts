import { Server as HttpServer } from 'http';
import { Socket, Server } from 'socket.io';
import { v4 } from 'uuid';

type User = {
  socketId: string;
  userId: string;
  name: string;
}

export class ServerSocket {
  public static instance: ServerSocket;
  public io: Server;

  /** Master list of all connected users */
  public users: { [uid: string]: User};

  constructor(server: HttpServer) {
    ServerSocket.instance = this;
    this.users = {};
    this.io = new Server(server, {
        serveClient: false,
        pingInterval: 10000,
        pingTimeout: 5000,
        cookie: false,
        cors: {
            origin: '*'
        }
    });

    this.io.on('connect', this.StartListeners);
    console.log("Socket IO started.")
  }

  StartListeners = (socket: Socket) => {
    console.info('Message received from ' + socket.id);

    socket.on('handshake', (callback: (uid: string, users: User[]) => void) => {
        const userId = socket.handshake.query.userId;
        console.info('Handshake received from: ' + socket.id);

        const reconnected = Object.values(this.users).some((user) => user.socketId === socket.id);

        if (reconnected) {
            console.info('This user has reconnected.');

            const uid = this.GetUidFromSocketID(socket.id);

            const users = Object.values(this.users);

            if (uid) {
                console.info('Sending callback for reconnect ...');
                callback(uid, users);
                return;
            }
        }

        let uid = userId as string;
        if (!uid) {
          uid = v4();
        }
        
        if(this.users[uid]?.socketId) {
          this.users[uid].socketId = socket.id;
          this.users[uid].userId = uid;
        }else {
          this.users = {
            ...this.users,
            [uid]: {
              socketId: socket.id,
              userId: uid,
              name: "",
            }
          }
        }

        const users = Object.values(this.users);
        console.info('Sending callback ...');
        callback(uid, users);

        this.SendMessage(
            'user_connected',
            users.filter((user) => user.socketId !== socket.id),
            users
        );
    });

    socket.on('disconnect', () => {
        console.info('Disconnect received from: ' + socket.id);

        const uid = this.GetUidFromSocketID(socket.id);

        if (uid) {
            delete this.users[uid];

            const users = Object.values(this.users);

            this.SendMessage('user_disconnected', users, uid);
        }
    });

    socket.on("set_name", (data: {userId: string, name: string}) => {
      if(this.users[data.userId]) {
        this.users[data.userId].name = data.name;
        const users = Object.values(this.users);
        this.SendMessage('user_setname', users, {
          users: users,
          userId: data.userId,
          name: data.name
        });
      }
    })

    socket.on("push_bell", (data: {userId: string}) => {
      if(this.users[data.userId]) {
        const users = Object.values(this.users);
        this.SendMessage('user_push_bell', users, {
          users: users,
          userId: data.userId,
        });
      }
    })
  };

  GetUidFromSocketID = (id: string) => {
      return Object.keys(this.users).find((uid) => this.users[uid].socketId === id);
  };

  SendMessage = (name: string, users: User[], payload?: Object) => {
      console.info('Emitting event: ' + name + ' to', users);
      users.forEach((user) => (payload ? this.io.to(user.socketId).emit(name, payload) : this.io.to(user.socketId).emit(name)));
  };

  SendSingleMessage = (name: string, userId: string, payload?: Object) => {
    payload 
      ? this.io.to(this.users[userId].socketId).emit(name, payload) 
      : this.io.to(this.users[userId].socketId).emit(name);
  };

  SetSong = (position: string, status: string) => {
    this.io.emit("set_song", JSON.stringify({
      position: position,
      status: status
    }))
  }

  ControlSong = (status: string) => {
    this.io.emit("control_song", JSON.stringify({
      status: status
    }))
  }
}