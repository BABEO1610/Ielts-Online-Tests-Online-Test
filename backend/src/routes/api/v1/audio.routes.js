const express = require('express');
const router = express.Router();
const AudioController = require('../../../controllers/audioController');
const upload = require('../../../config/multer'); // Use multer

// Upload audio file (using multer middleware)
router.post('/upload', upload.single('audio'), AudioController.uploadAudio);

// Delete audio file
router.delete('/:path', AudioController.deleteAudio);

module.exports = router;

