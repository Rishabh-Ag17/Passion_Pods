// routes/chat.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message'); // Import controller

// Ensure this matches the expected URL and call the correct function in messageController
router.get('/chat/:currentUserId/:chatPartnerId', messageController.fetchMessages);

module.exports = router;
