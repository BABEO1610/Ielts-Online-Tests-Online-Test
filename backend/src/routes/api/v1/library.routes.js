const express = require('express');
const router = express.Router();
const libraryController = require('../../../controllers/library.controller');

// Public routes cho Student xem danh sách tài liệu
router.get('/', libraryController.getApprovedResources);
router.get('/:id', libraryController.getResourceById);

module.exports = router;
