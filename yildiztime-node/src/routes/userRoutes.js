const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Kullanıcı kaydı
router.post('/register', userController.register);

// Kullanıcı girişi
router.post('/login', userController.login);

// Kullanıcı profili görüntüleme
router.get('/profile', auth, userController.getProfile);

// Kullanıcı profili güncelleme
router.patch('/profile', auth, userController.updateProfile);

// Kullanıcı takip etme
router.post('/follow/:id', auth, userController.followUser);

// Kullanıcı takibi bırakma
router.post('/unfollow/:id', auth, userController.unfollowUser);

module.exports = router; 