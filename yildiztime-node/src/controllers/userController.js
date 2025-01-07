const User = require('../models/User');

// Kullanıcı kaydı
exports.register = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Kullanıcı girişi
exports.login = async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password);
    const token = user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(400).send({ error: 'Giriş başarısız' });
  }
};

// Kullanıcı profili görüntüleme
exports.getProfile = async (req, res) => {
  res.send(req.user);
};

// Kullanıcı profili güncelleme
exports.updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'department', 'yearOfStudy', 'profileImage'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Geçersiz güncelleme!' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.send(req.user);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Kullanıcı takip etme
exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    if (req.user.following.includes(userToFollow._id)) {
      return res.status(400).send({ error: 'Bu kullanıcıyı zaten takip ediyorsunuz' });
    }

    req.user.following.push(userToFollow._id);
    userToFollow.followers.push(req.user._id);

    await req.user.save();
    await userToFollow.save();

    res.send({ message: 'Kullanıcı takip edildi' });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Kullanıcı takibi bırakma
exports.unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    if (!userToUnfollow) {
      return res.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    req.user.following = req.user.following.filter(id => id.toString() !== req.params.id);
    userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== req.user._id.toString());

    await req.user.save();
    await userToUnfollow.save();

    res.send({ message: 'Takipten çıkıldı' });
  } catch (error) {
    res.status(400).send(error);
  }
}; 