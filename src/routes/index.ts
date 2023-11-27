import express from 'express';
const router = express.Router();
import ytdl = require('ytdl-core');
import expressAsyncHandler from 'express-async-handler';
import fs from 'fs';
import ffmpegPath = require('@ffmpeg-installer/ffmpeg');
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath.path);
import path from 'path';
import validator from 'validator';
const downloadsFolder = path.join(__dirname, '../downloads');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post(
  '/mp3',
  expressAsyncHandler(async (req, res, next) => {
    try {
      // url given by the client via frontend
      const url = req.body.url;

      // object of metadata from the youtube video url
      const videoInfo = await ytdl.getInfo(url);
      const vidTitle = videoInfo.player_response.videoDetails.title;
      const vidThumbnail = videoInfo.videoDetails.thumbnails[3].url;
      const downloadTitle = `${validator.escape(
        vidTitle.replace(/\s+/g, '').slice(0, 15)
      )}.mp3`;

      const webmFilePath = path.join(
        downloadsFolder,
        `${validator.escape(vidTitle.replace(/\s+/g, '')).slice(0, 15)}.webm`
      );
      const mp3FilePath = path.join(downloadsFolder, `${downloadTitle}`);

      const downloadStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
      });

      const fileWriteStream = fs.createWriteStream(webmFilePath);
      await new Promise((resolve, reject) => {
        downloadStream
          .pipe(fileWriteStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      await new Promise((resolve, reject) => {
        ffmpeg(webmFilePath)
          .audioCodec('libmp3lame')
          .on('end', resolve)
          .on('error', reject)
          .save(mp3FilePath);
      });

      setTimeout(() => {
        // Delete the file
        fs.unlink(mp3FilePath, (deleteError) => {
          if (deleteError) {
            console.error('Error deleting file:', deleteError);
          } else {
            console.log(`File ${downloadTitle} deleted after 5 minutes.`);
          }
        });
        fs.unlink(webmFilePath, (deleteError) => {
          if (deleteError) {
            console.error('Error deleting file:', deleteError);
          } else {
            console.log(`File ${downloadTitle} deleted after 5 minutes.`);
          }
        });
      }, 5 * 60 * 1000); // 5 minutes in milliseconds
      // const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
      // const { key, bpm } = await getBpmAndKey(mp3FilePath);
      res.status(200).json({
        title: `${vidTitle}`,
        downloadTitle,
        vidThumbnail,
      });
    } catch (err) {
      console.log(err);
      res.status(404).json({ err });
    }
  })
);

router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log(filename);
  const filePath = path.join(downloadsFolder, filename);

  // Send the file as the response
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error sending file', err);
      res.status(500).json({ error: 'Internal Service Error' });
    }
  });
});

router.get('/clientdownload/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log(filename);
  const filePath = path.join(downloadsFolder, filename);

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Send the file as the response
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file', err);
      res.status(500).json({ error: 'Internal Service Error' });
    }
  });
});

export default router;
