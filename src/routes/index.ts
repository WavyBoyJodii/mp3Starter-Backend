import express from 'express';
const router = express.Router();
import ytdl = require('ytdl-core');
import expressAsyncHandler from 'express-async-handler';

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get(
  '/mp3',
  expressAsyncHandler(async (req, res, next) => {
    try {
      const url = req.body.url;
      const videoInfo = await ytdl.getInfo(url);
      const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
      console.log(audioFormats);
    } catch (err) {
      console.log(err);
    }
  })
);

export default router;
