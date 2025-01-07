const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  groupInfo: {
    name: String,
    description: String,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Konuşmadaki okunmamış mesaj sayısını güncelle
conversationSchema.methods.updateUnreadCount = async function(userId) {
  const userUnreadCount = this.unreadCounts.find(
    count => count.user.toString() === userId.toString()
  );

  if (userUnreadCount) {
    userUnreadCount.count += 1;
  } else {
    this.unreadCounts.push({
      user: userId,
      count: 1
    });
  }

  await this.save();
};

// Konuşmadaki okunmamış mesajları sıfırla
conversationSchema.methods.resetUnreadCount = async function(userId) {
  const userUnreadCount = this.unreadCounts.find(
    count => count.user.toString() === userId.toString()
  );

  if (userUnreadCount) {
    userUnreadCount.count = 0;
    await this.save();
  }
};

// İki kullanıcı arasındaki konuşmayı bul veya oluştur
conversationSchema.statics.findOrCreateDM = async function(user1Id, user2Id) {
  let conversation = await this.findOne({
    participants: { $all: [user1Id, user2Id] },
    isGroup: false
  });

  if (!conversation) {
    conversation = new this({
      participants: [user1Id, user2Id],
      isGroup: false
    });
    await conversation.save();
  }

  return conversation;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 