const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  media: [{
    url: String,
    type: String, // 'image' veya 'video'
    thumbnail: String // video için küçük resim
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// İçerikten hashtag'leri çıkaran yardımcı fonksiyon
postSchema.methods.extractHashtags = function() {
  const hashtagRegex = /#[\wğüşıöçĞÜŞİÖÇ]+/g;
  const matches = this.content.match(hashtagRegex) || [];
  this.hashtags = matches.map(tag => tag.slice(1).toLowerCase()); // # işaretini kaldır ve küçük harfe çevir
};

// Kaydetmeden önce hashtag'leri çıkar
postSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.extractHashtags();
  }
  next();
});

// Trend hashtag'leri getiren statik metod
postSchema.statics.getTrendingHashtags = async function(limit = 10) {
  const result = await this.aggregate([
    // Son 7 gün içindeki gönderileri filtrele
    {
      $match: {
        createdAt: { 
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        }
      }
    },
    // Hashtag dizisini ayrı dokümanlara böl
    { $unwind: '$hashtags' },
    // Hashtag'lere göre grupla ve say
    {
      $group: {
        _id: '$hashtags',
        count: { $sum: 1 },
        posts: { $push: '$_id' },
        lastUsed: { $max: '$createdAt' }
      }
    },
    // En çok kullanılanları seç
    { $sort: { count: -1, lastUsed: -1 } },
    { $limit: limit }
  ]);

  return result;
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 