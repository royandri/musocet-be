import http from "http";
import express from "express";
import { ServerSocket } from "./socket";

const application = express();

/** Server Handling */
const httpServer = http.createServer(application);

/** Start Socket */
new ServerSocket(httpServer);

/** Log the request */
application.use((req, res, next) => {
  console.info(
    `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`
  );

  res.on("finish", () => {
    console.info(
      `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`
    );
  });

  next();
});

/** Parse the body of the request */
application.use(express.urlencoded({ extended: true }));
application.use(express.json());

/** Rules of our API */
application.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method == "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }

  next();
});

application.post("/set_song", (req, res, next) => {
  const song_position = req.query.position;
  const song_status = req.query.status;
  ServerSocket.instance.SetSong(song_position as any, song_status as string);
  return res.status(200).json({ message: "Success set song status" });
});

application.post("/control_song", (req, res, next) => {
  const song_status = req.query.status;
  ServerSocket.instance.ControlSong(song_status as string);
  return res.status(200).json({ message: "Success send request stop song" });
});

application.post("/set_score", (req, res, next) => {
  const userId = req.query.userId as string;
  const score = req.query.score as string;
  ServerSocket.instance.SetScore(userId, parseInt(score));
  return res.status(200).json({ message: "Success send request set score" });
});

/** Error handling */
application.use((req, res, next) => {
  const error = new Error("Not found");

  res.status(404).json({
    message: error.message,
  });
});

/** Listen */
httpServer.listen(process.env.PORT || 5000, () =>
  console.info(`Server is running`)
);
