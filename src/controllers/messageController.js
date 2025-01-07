const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Story = require('../models/Story');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const sizeOf = promisify(require('image-size'));
const ffmpeg = require('fluent-ffmpeg');
const pdf = require('pdf-parse');

// PDF önizleme oluşturma fonksiyonu
const generatePDFPreview = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return {
      pageCount: data.numpages,
      preview: data.text.slice(0, 500) // İlk 500 karakter
    };
  } catch (error) {
    console.error('PDF önizleme hatası:', error);
    return null;
  }
};

// Video sıkıştırma fonksiyonu
const compressVideo = async (videoPath, filename) => {
  const outputPath = path.join('uploads', `compressed_${filename}`);
  const fullOutputPath = path.join(__dirname, '..', '..', outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoCodec('libx264')
      .size('1280x?')
      .videoBitrate('1000k')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-preset fast',
        '-movflags faststart',
        '-profile:v main',
        '-level 3.1',
        '-crf 23'
      ])
      .output(fullOutputPath)
      .on('end', () => resolve('/' + outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
};

// Video thumbnail oluşturma fonksiyonu
const generateThumbnail = async (videoPath, filename) => {
  const thumbnailPath = path.join('uploads', `thumb_${filename.split('.')[0]}.jpg`);
  const fullThumbnailPath = path.join(__dirname, '..', '..', thumbnailPath);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: `thumb_${filename.split('.')[0]}.jpg`,
        folder: path.join(__dirname, '..', '..', 'uploads'),
        size: '320x240'
      })
      .on('end', () => resolve('/' + thumbnailPath))
      .on('error', (err) => reject(err));
  });
};

// Mesaj gönderme
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text', storyReply } = req.body;

    // Konuşmayı bul veya oluştur
    const conversation = await Conversation.findOrCreateDM(req.user._id, recipientId);

    // Mesajı oluştur
    const message = new Message({
      conversation: conversation._id,
      sender: req.user._id,
      content,
      messageType,
      storyReply
    });

    await message.save();

    // Konuşmanın son mesajını güncelle
    conversation.lastMessage = message._id;
    await conversation.updateUnreadCount(recipientId);
    await conversation.save();

    // Mesajı populate et
    await message.populate('sender', 'name profileImage');
    
    res.status(201).send(message);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Medya mesajı gönderme
exports.sendMediaMessage = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const file = req.file;
    let originalPath = file.path;

    if (!file) {
      return res.status(400).send({ error: 'Dosya yüklenmedi' });
    }

    // Konuşmayı bul veya oluştur
    const conversation = await Conversation.findOrCreateDM(req.user._id, recipientId);

    // Dosya tipini belirle
    let messageType = 'text';
    if (file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      messageType = 'voice';
    } else if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/')) {
      messageType = 'document';
    }

    // Medya bilgilerini al
    const media = {
      type: messageType,
      size: file.size,
      url: `/uploads/${file.filename}`
    };

    // Doküman bilgilerini ekle
    if (messageType === 'document') {
      media.document = {
        fileName: file.originalname,
        fileType: path.extname(file.originalname).slice(1)
      };

      // PDF için sayfa sayısı ve önizleme
      if (file.mimetype === 'application/pdf') {
        const pdfInfo = await generatePDFPreview(file.path);
        if (pdfInfo) {
          media.document.pageCount = pdfInfo.pageCount;
          media.document.preview = pdfInfo.preview;
        }
      }
    }
    // Resim boyutlarını al
    else if (messageType === 'image') {
      const dimensions = await sizeOf(file.path);
      media.dimensions = {
        width: dimensions.width,
        height: dimensions.height
      };
    }
    // Video işleme
    else if (messageType === 'video') {
      try {
        const metadata = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(file.path, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata);
          });
        });

        if (metadata.streams[0].width && metadata.streams[0].height) {
          media.dimensions = {
            width: metadata.streams[0].width,
            height: metadata.streams[0].height
          };
        }

        if (file.size > 10 * 1024 * 1024 || (media.dimensions && media.dimensions.height > 720)) {
          const compressedUrl = await compressVideo(file.path, file.filename);
          media.url = compressedUrl;
          
          const compressedMetadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(path.join(__dirname, '..', '..', compressedUrl), (err, metadata) => {
              if (err) reject(err);
              else resolve(metadata);
            });
          });

          media.duration = compressedMetadata.format.duration;
          media.size = compressedMetadata.format.size;
          
          await fs.unlink(originalPath).catch(() => {});
          originalPath = path.join(__dirname, '..', '..', compressedUrl);
        } else {
          media.duration = metadata.format.duration;
        }

        const thumbnailUrl = await generateThumbnail(originalPath, file.filename);
        media.thumbnail = thumbnailUrl;
      } catch (err) {
        console.error('Video işleme hatası:', err);
        throw err;
      }
    }
    // Ses dosyası için süre
    else if (messageType === 'voice') {
      const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file.path, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      media.duration = metadata.format.duration;
    }

    // Mesajı oluştur
    const message = new Message({
      conversation: conversation._id,
      sender: req.user._id,
      messageType,
      media
    });

    await message.save();

    // Konuşmanın son mesajını güncelle
    conversation.lastMessage = message._id;
    await conversation.updateUnreadCount(recipientId);
    await conversation.save();

    // Mesajı populate et
    await message.populate('sender', 'name profileImage');
    
    res.status(201).send(message);
  } catch (error) {
    // Hata durumunda yüklenen dosyaları sil
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
      if (req.file.thumbnail) {
        await fs.unlink(req.file.thumbnail).catch(() => {});
      }
    }
    res.status(400).send(error);
  }
};

// Story'e cevap gönderme
exports.sendStoryReply = async (req, res) => {
  try {
    const { storyId, content } = req.body;
    const story = await Story.findById(storyId).populate('author', 'id');
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    // Story sahibiyle konuşma oluştur
    const conversation = await Conversation.findOrCreateDM(req.user._id, story.author._id);

    // Story cevabını mesaj olarak gönder
    const message = new Message({
      conversation: conversation._id,
      sender: req.user._id,
      content,
      messageType: 'story_reply',
      storyReply: {
        storyId: story._id,
        content: story.content
      }
    });

    await message.save();

    // Konuşmanın son mesajını güncelle
    conversation.lastMessage = message._id;
    await conversation.updateUnreadCount(story.author._id);
    await conversation.save();

    await message.populate('sender', 'name profileImage');
    
    res.status(201).send(message);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Konuşmaları listeleme
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name profileImage')
    .populate('lastMessage')
    .populate({
      path: 'unreadCounts',
      match: { user: req.user._id }
    })
    .sort({ updatedAt: -1 });

    res.send(conversations);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Konuşma mesajlarını getirme
exports.getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).send({ error: 'Konuşma bulunamadı' });
    }

    // Okunmamış mesajları sıfırla
    await conversation.resetUnreadCount(req.user._id);

    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: false
    })
    .populate('sender', 'name profileImage')
    .populate('readBy.user', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.send(messages);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Mesajı okundu olarak işaretleme
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).send({ error: 'Mesaj bulunamadı' });
    }

    // Kullanıcı zaten mesajı okuduysa
    if (message.readBy.some(read => read.user.toString() === req.user._id.toString())) {
      return res.send(message);
    }

    message.readBy.push({
      user: req.user._id,
      readAt: new Date()
    });

    await message.save();
    res.send(message);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Mesajı silme (soft delete)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id
    });

    if (!message) {
      return res.status(404).send({ error: 'Mesaj bulunamadı' });
    }

    message.isDeleted = true;
    await message.save();

    // Medya dosyasını sil
    if (message.media && message.media.url) {
      const filePath = path.join(__dirname, '..', '..', message.media.url);
      await fs.unlink(filePath).catch(() => {});

      // Thumbnail'i de sil
      if (message.media.thumbnail) {
        const thumbnailPath = path.join(__dirname, '..', '..', message.media.thumbnail);
        await fs.unlink(thumbnailPath).catch(() => {});
      }
    }

    res.send({ message: 'Mesaj silindi' });
  } catch (error) {
    res.status(500).send(error);
  }
}; 