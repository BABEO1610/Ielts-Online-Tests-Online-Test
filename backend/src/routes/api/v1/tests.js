const express = require('express');
const router = express.Router();
const TestController = require('../../../controllers/testController');

// Define route for creating tests
router.post('/', TestController.createTest);

// Define route for fetching tests list
router.get('/', TestController.getTests);

// Define route for fetching a single test by ID
router.get('/:id', TestController.getTestById);

// Define route for updating a test
router.put('/:id', TestController.updateTest);

// Define route for deleting a test
router.delete('/:id', TestController.deleteTest);

module.exports = router;
