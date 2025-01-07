const Notification = require('../models/Notification');

// Bildirim oluşturma
exports.createNotification = async (recipientId, senderId, type, data = {}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      ...data
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    throw error;
  }
};

// Bildirimleri getirme
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name profileImage')
      .populate('post', 'content')
      .populate('story')
      .populate('comment', 'content')
      .sort({ createdAt: -1 })
      .limit(50);

    res.send(notifications);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Okunmamış bildirim sayısını getirme
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.send({ count });
  } catch (error) {
    res.status(500).send(error);
  }
};

// Bildirimi okundu olarak işaretleme
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).send({ error: 'Bildirim bulunamadı' });
    }

    notification.read = true;
    await notification.save();

    res.send(notification);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Tüm bildirimleri okundu olarak işaretleme
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.send({ message: 'Tüm bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    res.status(500).send(error);
  }
};

// Bildirimi silme
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).send({ error: 'Bildirim bulunamadı' });
    }

    res.send({ message: 'Bildirim silindi' });
  } catch (error) {
    res.status(500).send(error);
  }
}; 