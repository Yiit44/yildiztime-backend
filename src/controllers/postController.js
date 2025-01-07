const Post = require('../models/Post');
const User = require('../models/User');
const notificationController = require('./notificationController');

// Post oluşturma
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      author: req.user._id
    });

    // İçerikten hashtag'leri çıkar
    if (req.body.content) {
      post.extractHashtags();
    }

    await post.save();
    await post.populate('author', 'name profileImage');
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Tüm post'ları getirme
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name profileImage')
      .populate('likes.user', 'name profileImage')
      .populate('comments.user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.send(posts);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Takip edilen kullanıcıların post'larını getirme
exports.getFollowingPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const followingIds = [...user.following, req.user._id];

    const posts = await Post.find({ author: { $in: followingIds } })
      .populate('author', 'name profileImage')
      .populate('likes.user', 'name profileImage')
      .populate('comments.user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.send(posts);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Tek bir post'u getirme
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name profileImage')
      .populate('likes.user', 'name profileImage')
      .populate('comments.user', 'name profileImage');

    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    res.send(post);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Post güncelleme
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    Object.keys(req.body).forEach(update => {
      post[update] = req.body[update];
    });

    await post.save();
    await post.populate('author', 'name profileImage');
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Post silme
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      author: req.user._id
    });

    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    res.send(post);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Post beğenme/beğenmekten vazgeçme
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    const likeIndex = post.likes.findIndex(like => 
      like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Beğeniyi kaldır
      post.likes.splice(likeIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      // Beğeni ekle
      post.likes.push({
        user: req.user._id,
        createdAt: new Date()
      });
      post.likeCount = post.likes.length;

      // Bildirim oluştur (kendi postunu beğenmemişse)
      if (post.author.toString() !== req.user._id.toString()) {
        await notificationController.createNotification(
          post.author,
          req.user._id,
          'like',
          { post: post._id }
        );
      }
    }

    await post.save();
    await post.populate('likes.user', 'name profileImage');
    
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Yorum ekleme
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    post.comments.push({
      user: req.user._id,
      content: req.body.content
    });

    post.commentCount = post.comments.length;
    await post.save();
    await post.populate('comments.user', 'name profileImage');

    // Bildirim oluştur (kendi postuna yorum yapmamışsa)
    if (post.author.toString() !== req.user._id.toString()) {
      await notificationController.createNotification(
        post.author,
        req.user._id,
        'comment',
        { 
          post: post._id,
          comment: post.comments[post.comments.length - 1]._id
        }
      );
    }
    
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Yorum silme
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    const comment = post.comments.id(req.params.commentId);
    
    if (!comment) {
      return res.status(404).send({ error: 'Yorum bulunamadı' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).send({ error: 'Bu yorumu silme yetkiniz yok' });
    }

    comment.remove();
    post.commentCount = post.comments.length;
    await post.save();
    
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Hashtag'e göre gönderi arama
exports.getPostsByHashtag = async (req, res) => {
  try {
    const hashtag = req.params.hashtag.toLowerCase();
    const posts = await Post.find({ hashtags: hashtag })
      .populate('author', 'name profileImage')
      .populate('likes.user', 'name profileImage')
      .populate('comments.user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(50);

    res.send(posts);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Trend hashtag'leri getirme
exports.getTrendingHashtags = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const trendingHashtags = await Post.getTrendingHashtags(limit);
    
    // Her hashtag için son 3 gönderiyi al
    const hashtagsWithPosts = await Promise.all(trendingHashtags.map(async (tag) => {
      const recentPosts = await Post.find({ hashtags: tag._id })
        .populate('author', 'name profileImage')
        .sort({ createdAt: -1 })
        .limit(3);

      return {
        hashtag: tag._id,
        count: tag.count,
        lastUsed: tag.lastUsed,
        recentPosts
      };
    }));

    res.send(hashtagsWithPosts);
  } catch (error) {
    res.status(500).send(error);
  }
}; 