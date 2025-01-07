const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

// Post oluşturma
router.post('/', auth, postController.createPost);

// Tüm post'ları getirme
router.get('/', auth, postController.getPosts);

// Takip edilen kullanıcıların post'larını getirme
router.get('/following', auth, postController.getFollowingPosts);

// Tek bir post'u getirme
router.get('/:id', auth, postController.getPost);

// Post güncelleme
router.patch('/:id', auth, postController.updatePost);

// Post silme
router.delete('/:id', auth, postController.deletePost);

// Post beğenme/beğenmekten vazgeçme
router.post('/:id/like', auth, postController.likePost);

// Yorum ekleme
router.post('/:id/comments', auth, postController.addComment);

// Yorum silme
router.delete('/:postId/comments/:commentId', auth, postController.deleteComment);

module.exports = router; 