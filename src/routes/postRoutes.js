const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');

// Tüm rotalar için auth middleware'ini kullan
router.use(auth);

// Özel rotalar (parametresiz)
router.post('/', postController.createPost);
router.get('/', postController.getPosts);
router.get('/following', postController.getFollowingPosts);
router.get('/trending/hashtags', postController.getTrendingHashtags);

// Hashtag rotası
router.get('/hashtags/:hashtag', postController.getPostsByHashtag);

// ID parametresi içeren rotalar
router.get('/:id', postController.getPost);
router.patch('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/like', postController.likePost);
router.post('/:id/comments', postController.addComment);
router.delete('/:postId/comments/:commentId', postController.deleteComment);

module.exports = router; 