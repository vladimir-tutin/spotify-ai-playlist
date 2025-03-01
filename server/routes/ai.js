const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');

router.post('/generate-playlist', aiController.generatePlaylist);
router.post('/analyze-tracks', aiController.analyzeTracks);

// Make sure this route is defined - this is the one that's returning 404
router.get('/stream-status/:streamId', aiController.getStreamStatus);

module.exports = router;