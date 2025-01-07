const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const auth = require('../middleware/auth');

// Story oluşturma
router.post('/', auth, storyController.createStory);

// Takip edilen kullanıcıların story'lerini getirme
router.get('/', auth, storyController.getStories);

// Belirli bir kullanıcının story'lerini getirme
router.get('/user/:userId', auth, storyController.getUserStories);

// Story görüntüleme
router.get('/:id', auth, storyController.viewStory);

// Story'e cevap verme
router.post('/:id/reply', auth, storyController.replyToStory);

// Progress güncelleme
router.post('/:id/progress', auth, storyController.updateProgress);

// Progress duraklatma
router.post('/:id/pause', auth, storyController.pauseProgress);

// Progress devam ettirme
router.post('/:id/resume', auth, storyController.resumeProgress);

// Story'ye yıldız ekle/kaldır
router.post('/:id/star', auth, storyController.toggleStar);

// Story silme
router.delete('/:id', auth, storyController.deleteStory);

module.exports = router; 