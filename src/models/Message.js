const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text' || this.messageType === 'story_reply';
    },
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'story_reply', 'image', 'video', 'voice', 'document'],
    default: 'text'
  },
  media: {
    url: String,
    type: String, // 'image', 'video', 'voice', 'document'
    thumbnail: String, // video için küçük resim
    duration: Number, // video ve ses için süre (saniye)
    size: Number, // dosya boyutu (byte)
    dimensions: {
      width: Number,
      height: Number
    },
    document: {
      fileName: String, // orijinal dosya adı
      fileType: String, // dosya tipi (pdf, doc, docx, vb.)
      pageCount: Number, // PDF için sayfa sayısı
      preview: String // PDF için ilk sayfa önizlemesi
    }
  },
  storyReply: {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    },
    content: String
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 