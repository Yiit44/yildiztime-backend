const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  postType: {
    type: String,
    enum: ['normal', 'duyuru', 'etkinlik', 'ders_notu'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Post silindiğinde yapılacak işlemler
postSchema.pre('remove', async function(next) {
  // Burada bildirimler veya ilişkili veriler silinebilir
  next();
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 