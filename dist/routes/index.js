"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const ytdl = require("ytdl-core");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const fs_1 = __importDefault(require("fs"));
const ffmpegPath = require("@ffmpeg-installer/ffmpeg");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
fluent_ffmpeg_1.default.setFfmpegPath(ffmpegPath.path);
const path_1 = __importDefault(require("path"));
const validator_1 = __importDefault(require("validator"));
const downloadsFolder = path_1.default.join(__dirname, '../downloads');
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});
router.post('/mp3', (0, express_async_handler_1.default)(async (req, res, next) => {
    try {
        // url given by the client via frontend
        const url = req.body.url;
        // object of metadata from the youtube video url
        const videoInfo = await ytdl.getInfo(url);
        const vidTitle = videoInfo.player_response.videoDetails.title;
        const vidThumbnail = videoInfo.videoDetails.thumbnails[3].url;
        const downloadTitle = `${validator_1.default.escape(vidTitle.replace(/\s+/g, '').slice(0, 15))}.mp3`;
        const webmFilePath = path_1.default.join(downloadsFolder, `${validator_1.default.escape(vidTitle.replace(/\s+/g, '')).slice(0, 15)}.webm`);
        const mp3FilePath = path_1.default.join(downloadsFolder, `${downloadTitle}`);
        const downloadStream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
        });
        const fileWriteStream = fs_1.default.createWriteStream(webmFilePath);
        await new Promise((resolve, reject) => {
            downloadStream
                .pipe(fileWriteStream)
                .on('finish', resolve)
                .on('error', reject);
        });
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(webmFilePath)
                .audioCodec('libmp3lame')
                .on('end', resolve)
                .on('error', reject)
                .save(mp3FilePath);
        });
        setTimeout(() => {
            // Delete the file
            fs_1.default.unlink(mp3FilePath, (deleteError) => {
                if (deleteError) {
                    console.error('Error deleting file:', deleteError);
                }
                else {
                    console.log(`File ${downloadTitle} deleted after 5 minutes.`);
                }
            });
            fs_1.default.unlink(webmFilePath, (deleteError) => {
                if (deleteError) {
                    console.error('Error deleting file:', deleteError);
                }
                else {
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
    }
    catch (err) {
        console.log(err);
        res.status(404).json({ err });
    }
}));
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log(filename);
    const filePath = path_1.default.join(downloadsFolder, filename);
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
    const filePath = path_1.default.join(downloadsFolder, filename);
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
exports.default = router;
//# sourceMappingURL=index.js.map