
// External modules
var https = require("https");
require('dotenv').config();
const cp = require("child_process");
const ffmpeg = require("ffmpeg-static");
const request = require("request");
const express = require("express");
const ytdl = require("ytdl-core");
var cors = require("cors");
const bodyParser = require("body-parser");

// const route=express.Router();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

function checkMimtype(mimtype) {
  return mimtype.mimeType.split("/")[0] === "audio";
}
function checkvMimtype(mimtype) {
  return (mimtype.itag == 137) | (mimtype.itag == 136);
}


let port = process.env.PORT;
if (port == null || port == "") {
  port = 8080;
}

app.get("/", async (req, res) => {
  res.json({ massage: "wellcome!" });
});

app.post("/api/v1", async (req, res) => {
  console.log(req.body.video_url);
  // const data={
  // 	"url":req.body.videoid
  // }
  const videoId = req.body.video_url;
  let info = await ytdl.getInfo(videoId);
  // res.json(ytdl(videoId, { filter: format => format.itag === 22 }))

  res.json({
    // info
    video: info.player_response.streamingData.formats,
    audio:
      info.player_response.streamingData.adaptiveFormats.filter(checkMimtype),
    title_thum: {
      title: info.player_response.videoDetails.title,
      thumb:
        info.player_response.videoDetails.thumbnail.thumbnails.slice(-1)[0].url,
      videoid: info.player_response.videoDetails.videoId,
    },
    hvideo:
      info.player_response.streamingData.adaptiveFormats.filter(checkvMimtype),
  });
});

// downlaod route
app.get("/download", async (req, res) => {
  let { title, mimeType, url, len } = req.query;
  title = encodeURI(title);


  if (mimeType.split("/")[0] === "video") {
    res.header("Content-Disposition", `attachment; filename="${title}.mp4"`);
    res.header("Content-type", "application/octet-stream");
    res.header("Content-Length", len);

    // res.header('Content-Type', 'video/mp4');
  } else if (mimeType.split("/")[0] === "audio") {
    res.header("Content-Disposition", `attachment; filename="${title}.mp3"`);
    // res.header('Content-Type', 'audio/mp3');
    res.header("Content-Length", len);
    res.setHeader("Content-type", "application/octet-stream");
  }

  request(url).pipe(res);
  // https.get(url, remote_response => remote_response.pipe(res));
});

app.get("/downloads", async (req, res) => {
  const { title, videourl, audiourl } = req.query;
  res.setHeader("Content-Disposition", `attachment; filename=${title}.mp4`);
  // res.setHeader(`'content-length': ${},`)
  res.setHeader("Content-Type", "video/mp4");
  const audio = request(audiourl);
  const video = request(videourl);
  

  const ffmpegProcess = cp.spawn(
    ffmpeg,
    [
      "-i",
      `pipe:3`,
      "-i",
      `pipe:4`,
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-c:v",
      "copy",
      "-c:a",
      "libmp3lame",
      "-crf",
      "27",
      "-preset",
      "veryfast",
      "-movflags",
      "frag_keyframe+empty_moov",
      "-f",
      "mp4",
      "-loglevel",
      "error",
      "-",
    ],
    {
      stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
    }
  );

  video.pipe(ffmpegProcess.stdio[3]);
  audio.pipe(ffmpegProcess.stdio[4]);
  ffmpegProcess.stdio[1].pipe(res);

  let ffmpegLogs = "";

  ffmpegProcess.stdio[2].on("data", (chunk) => {
    ffmpegLogs += chunk.toString();
  });

  ffmpegProcess.on("exit", (exitCode) => {
    if (exitCode === 1) {
      console.error(ffmpegLogs);
    }
  });
});

app.listen(port, console.log("working...", port));
