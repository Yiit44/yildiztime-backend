const express = require('express');
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Tüm rotalar için auth middleware'ini kullan
router.use(auth);

// Bildirimleri getir
router.get('/', notificationController.getNotifications);

// Okunmamış bildirim sayısını getir
router.get('/unread/count', notificationController.getUnreadCount);

// Bildirimi okundu olarak işaretle
router.patch('/:id/read', notificationController.markAsRead);

// Tüm bildirimleri okundu olarak işaretle
router.patch('/read/all', notificationController.markAllAsRead);

// Bildirimi sil
router.delete('/:id', notificationController.deleteNotification);

module.exports = router; 