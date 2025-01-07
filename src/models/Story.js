const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return !this.media; // Eğer medya yoksa içerik zorunlu
    }
  },
  media: {
    url: String,
    type: String, // 'image' veya 'video'
    thumbnail: String // video için küçük resim
  },
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  stars: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    starredAt: {
      type: Date,
      default: Date.now
    }
  }],
  starCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat sonra
    }
  }
}, {
  timestamps: true
});

// Story'nin süresi doldu mu kontrolü
storySchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt;
};

// Story'ye yıldız ekle/kaldır
storySchema.methods.toggleStar = async function(userId) {
  const starIndex = this.stars.findIndex(star => 
    star.user.toString() === userId.toString()
  );

  if (starIndex > -1) {
    // Yıldızı kaldır
    this.stars.splice(starIndex, 1);
    this.starCount = Math.max(0, this.starCount - 1);
    return false; // yıldız kaldırıldı
  } else {
    // Yıldız ekle
    this.stars.push({ user: userId });
    this.starCount = this.stars.length;
    return true; // yıldız eklendi
  }
};

const Story = mongoose.model('Story', storySchema);

module.exports = Story; 