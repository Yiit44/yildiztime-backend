const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Mesaj gönderme
router.post('/', auth, messageController.sendMessage);

// Medya mesajı gönderme
router.post('/media', auth, upload.single('media'), messageController.sendMediaMessage);

// Story'e cevap gönderme
router.post('/story-reply', auth, messageController.sendStoryReply);

// Konuşmaları listeleme
router.get('/conversations', auth, messageController.getConversations);

// Konuşma mesajlarını getirme
router.get('/conversations/:conversationId', auth, messageController.getMessages);

// Mesajı okundu olarak işaretleme
router.post('/:messageId/read', auth, messageController.markAsRead);

// Mesajı silme
router.delete('/:messageId', auth, messageController.deleteMessage);

module.exports = router; 