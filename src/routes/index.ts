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
// const AWS = require('aws-sdk');
import AWS from 'aws-sdk';
import { Writable } from 'stream';
const s3 = new AWS.S3();

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

      const bucketName = 'cyclic-wig-bullfrog-us-east-1';

      // object of metadata from the youtube video url
      const videoInfo = await ytdl.getInfo(url);
      const vidTitle = videoInfo.player_response.videoDetails.title;
      const vidThumbnail = videoInfo.videoDetails.thumbnails[3].url;
      const downloadTitle = `${validator.escape(
        vidTitle.replace(/\s+/g, '').slice(0, 15)
      )}.mp3`;

      const downloadStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
      });

      // Function to upload the buffer to S3
      function uploadToS3(key: string, buffer: Buffer) {
        const params = {
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: 'audio/mpeg', // Set the correct content type based on the file type
        };

        s3.upload(
          params,
          (
            err: Error | null,
            data: AWS.S3.ManagedUpload.SendData | undefined
          ) => {
            if (err) {
              console.error('Error uploading to S3:', err);
            } else {
              console.log('File uploaded to S3:', data.Location);
            }
          }
        );
      }

      // Function to delete the file from S3
      async function deleteFileFromS3(bucket: string, key: string) {
        try {
          // Delete the file from S3
          await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
          console.log(`File ${key} deleted from S3.`);
        } catch (error) {
          console.error('Error deleting file from S3:', error);
        }
      }

      // Create a writable stream to store the MP3 file in memory
      const mp3Stream = new Writable();
      let mp3Buffer = Buffer.from([]);

      mp3Stream._write = function (chunk, encoding, done) {
        mp3Buffer = Buffer.concat([mp3Buffer, chunk]);
        done();
      };

      ffmpeg(downloadStream)
        .audioCodec('libmp3lame')
        .toFormat('mp3')
        .on('end', () => {
          console.log('Conversion to mp3 Finished');
          uploadToS3(downloadTitle, mp3Buffer); // End the s3 Stream when the conversion is completed
          setTimeout(() => {
            deleteFileFromS3(bucketName, downloadTitle);
          }, 5 * 60 * 1000);
        })
        .on('error', (err) => {
          console.error('Error converting to MP3', err);
        })
        .pipe(mp3Stream);

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
  // const filePath = path.join(downloadsFolder, filename);
  const bucket = 'cyclic-wig-bullfrog-us-east-1';

  // generate a pre-signed URL for the s3 object
  const params = {
    Bucket: bucket,
    Key: filename,
    Expires: 300,
  };

  s3.getSignedUrl('getObject', params, (err, url) => {
    if (err) {
      console.error('Error generating pre-signed URL:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.redirect(url);
    }
  });
});

router.get('/clientdownload/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log(filename);
  const bucket = 'cyclic-wig-bullfrog-us-east-1';

  // generate a pre-signed URL for the s3 object
  const params = {
    Bucket: bucket,
    Key: filename,
    Expires: 300,
  };

  s3.getSignedUrl('getObject', params, (err, url) => {
    if (err) {
      console.error('Error generating pre-signed URL:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.redirect(url);
    }
  });
});

export default router;
