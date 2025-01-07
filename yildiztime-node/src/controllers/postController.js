const Post = require('../models/Post');

// Post oluşturma
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      author: req.user._id
    });
    
    // Hashtag'leri ayıkla
    if (req.body.content) {
      const hashtags = req.body.content.match(/#[a-zA-ZğüşıöçĞÜŞİÖÇ0-9]+/g) || [];
      post.hashtags = hashtags.map(tag => tag.slice(1).toLowerCase());
    }

    await post.save();
    await post.populate('author', 'name profileImage');
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Post'ları listeleme
exports.getPosts = async (req, res) => {
  try {
    const match = {};
    const sort = {};

    // Filtreleme seçenekleri
    if (req.query.postType) {
      match.postType = req.query.postType;
    }

    // Hashtag filtresi
    if (req.query.hashtag) {
      match.hashtags = req.query.hashtag;
    }

    // Sıralama seçenekleri
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    const posts = await Post.find(match)
      .populate('author', 'name profileImage')
      .populate('comments.user', 'name profileImage')
      .sort(sort)
      .limit(parseInt(req.query.limit) || 10)
      .skip(parseInt(req.query.skip) || 0);

    res.send(posts);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Takip edilen kullanıcıların post'larını getirme
exports.getFollowingPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      author: { $in: [...req.user.following, req.user._id] }
    })
    .populate('author', 'name profileImage')
    .populate('comments.user', 'name profileImage')
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 10)
    .skip(parseInt(req.query.skip) || 0);

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
  const updates = Object.keys(req.body);
  const allowedUpdates = ['content', 'image', 'postType'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Geçersiz güncelleme!' });
  }

  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });

    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    updates.forEach(update => post[update] = req.body[update]);
    
    // Hashtag'leri güncelle
    if (req.body.content) {
      const hashtags = req.body.content.match(/#[a-zA-ZğüşıöçĞÜŞİÖÇ0-9]+/g) || [];
      post.hashtags = hashtags.map(tag => tag.slice(1).toLowerCase());
    }

    await post.save();
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Post silme
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    
    if (!post) {
      return res.status(404).send({ error: 'Post bulunamadı' });
    }

    await post.remove();
    res.send({ message: 'Post silindi' });
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

    const likeIndex = post.likes.indexOf(req.user._id);

    if (likeIndex === -1) {
      // Post'u beğen
      post.likes.push(req.user._id);
    } else {
      // Beğenmekten vazgeç
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
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
      text: req.body.text
    });

    await post.save();
    await post.populate('comments.user', 'name profileImage');
    
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
    await post.save();
    
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
}; 