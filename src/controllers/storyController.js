const Story = require('../models/Story');
const User = require('../models/User');
const notificationController = require('./notificationController');

// Story oluşturma
exports.createStory = async (req, res) => {
  try {
    const story = new Story({
      ...req.body,
      author: req.user._id,
      progressBar: {
        isActive: true,
        startTime: new Date(),
        pausedAt: 0
      }
    });

    await story.save();
    await story.populate('author', 'name profileImage');
    res.status(201).send(story);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Takip edilen kullanıcıların story'lerini getirme
exports.getStories = async (req, res) => {
  try {
    // Kullanıcının takip ettiği kişilerin ID'leri + kendi ID'si
    const followingIds = [...req.user.following, req.user._id];

    // Son 24 saat içindeki story'leri getir
    const stories = await Story.find({
      author: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    })
    .populate('author', 'name profileImage')
    .populate('viewers.user', 'name profileImage')
    .populate('replies.user', 'name profileImage')
    .sort({ createdAt: -1 });

    // Story'leri kullanıcılara göre grupla ve progress bilgisi ekle
    const storiesByUser = stories.reduce((acc, story, index) => {
      const authorId = story.author._id.toString();
      if (!acc[authorId]) {
        acc[authorId] = {
          user: story.author,
          stories: [],
          currentIndex: 0,
          totalStories: 0
        };
      }

      // Her story için progress bilgisi ekle
      const viewer = story.viewers.find(v => v.user._id.toString() === req.user._id.toString());
      const progress = viewer ? viewer.progress : 0;
      const isViewed = progress === 100;

      acc[authorId].stories.push({
        ...story.toObject(),
        index: acc[authorId].stories.length,
        progress,
        isViewed,
        currentProgress: story.getProgress()
      });
      acc[authorId].totalStories++;
      return acc;
    }, {});

    res.send(Object.values(storiesByUser));
  } catch (error) {
    res.status(500).send(error);
  }
};

// Belirli bir kullanıcının story'lerini getirme
exports.getUserStories = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Kullanıcıyı kontrol et
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Eğer kullanıcı kendisi değilse ve takip etmiyorsa hata ver
    if (userId !== req.user._id.toString() && !req.user.following.includes(userId)) {
      return res.status(403).send({ error: 'Bu kullanıcının story\'lerini görme yetkiniz yok' });
    }

    const stories = await Story.find({
      author: userId,
      expiresAt: { $gt: new Date() }
    })
    .populate('author', 'name profileImage')
    .populate('viewers.user', 'name profileImage')
    .populate('replies.user', 'name profileImage')
    .sort({ createdAt: -1 });

    // Story'lere sıra numarası ekle
    const storiesWithIndex = stories.map((story, index) => ({
      ...story.toObject(),
      index,
      totalStories: stories.length
    }));

    res.send(storiesWithIndex);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Story görüntüleme
exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    // Story sahibi kendisi değilse ve takip etmiyorsa hata ver
    if (story.author.toString() !== req.user._id.toString() && 
        !req.user.following.includes(story.author)) {
      return res.status(403).send({ error: 'Bu story\'i görme yetkiniz yok' });
    }

    // Progress bar'ı başlat
    story.resumeProgress();

    // Kullanıcı daha önce görüntülemediyse viewers listesine ekle
    if (!story.isViewedBy(req.user._id)) {
      story.viewers.push({
        user: req.user._id,
        viewedAt: new Date(),
        progress: 0
      });
    }

    await story.save();
    await story.populate('author', 'name profileImage');
    await story.populate('viewers.user', 'name profileImage');
    await story.populate('replies.user', 'name profileImage');
    
    // Önceki ve sonraki story'leri bul
    const userStories = await Story.find({
      author: story.author,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: 1 });

    const currentIndex = userStories.findIndex(s => s._id.toString() === story._id.toString());
    const totalStories = userStories.length;
    const previousStory = currentIndex > 0 ? userStories[currentIndex - 1]._id : null;
    const nextStory = currentIndex < totalStories - 1 ? userStories[currentIndex + 1]._id : null;

    res.send({
      story: {
        ...story.toObject(),
        currentProgress: story.getProgress()
      },
      navigation: {
        currentIndex,
        totalStories,
        previousStory,
        nextStory
      }
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

// Story'e cevap verme
exports.replyToStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    // Story sahibi kendisi değilse ve takip etmiyorsa hata ver
    if (story.author.toString() !== req.user._id.toString() && 
        !req.user.following.includes(story.author)) {
      return res.status(403).send({ error: 'Bu story\'e cevap verme yetkiniz yok' });
    }

    await story.addReply(req.user._id, req.body.text);
    await story.populate('replies.user', 'name profileImage');

    // TODO: Burada mesajlaşma sistemine cevabı ekleyeceğiz
    // ve story sahibine bildirim göndereceğiz

    res.send(story);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Story silme
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    await story.remove();
    res.send({ message: 'Story silindi' });
  } catch (error) {
    res.status(500).send(error);
  }
};

// Progress güncelleme
exports.updateProgress = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    const { progress } = req.body;
    await story.updateProgress(req.user._id, progress);

    // Eğer progress 100 ise ve sonraki story varsa, onu döndür
    if (progress === 100) {
      const nextStory = await Story.findOne({
        author: story.author,
        createdAt: { $gt: story.createdAt },
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: 1 });

      if (nextStory) {
        res.send({ nextStoryId: nextStory._id });
        return;
      }
    }

    res.send({ currentProgress: story.getProgress() });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Progress duraklatma
exports.pauseProgress = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    story.pauseProgress();
    await story.save();

    res.send({ currentProgress: story.getProgress() });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Progress devam ettirme
exports.resumeProgress = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Story bulunamadı' });
    }

    story.resumeProgress();
    await story.save();

    res.send({ currentProgress: story.getProgress() });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Story'ye yıldız ekle/kaldır
exports.toggleStar = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).send({ error: 'Hikaye bulunamadı' });
    }

    if (story.isExpired()) {
      return res.status(400).send({ error: 'Bu hikayenin süresi dolmuş' });
    }

    const wasStarred = await story.toggleStar(req.user._id);
    await story.save();

    // Bildirim oluştur (sadece yıldız eklendiğinde)
    if (wasStarred && story.author.toString() !== req.user._id.toString()) {
      await notificationController.createNotification(
        story.author,
        req.user._id,
        'story_star',
        { story: story._id }
      );
    }

    res.send({
      message: wasStarred ? 'Hikaye yıldızlandı' : 'Hikayeden yıldız kaldırıldı',
      starCount: story.starCount
    });
  } catch (error) {
    res.status(400).send(error);
  }
}; 