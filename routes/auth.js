const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, class: userClass } = req.body;
    
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const user = new User({
      username,
      password,
      fullName,
      class: userClass,
      isAdmin: false // По умолчанию создаем обычного пользователя
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Попытка входа:', username);
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Необходимо указать имя пользователя и пароль' });
    }

    const user = await User.findOne({ username });
    console.log('Найденный пользователь:', {
      username: user?.username,
      hashedPassword: user?.password,
      isAdmin: user?.isAdmin
    });

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    console.log('Сравнение паролей:');
    console.log('Введённый пароль:', password);
    console.log('Хеш в базе:', user.password);

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Результат сравнения:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, isAdmin: user.isAdmin });
  } catch (err) {
    console.error('Ошибка при входе:', err);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
});

router.get('/setup-admin', async (req, res) => {
  try {
    await User.deleteOne({ username: 'admin' });

    const adminUser = new User({
      username: 'admin',
      password: 'admin123',
      fullName: 'Администратор системы',
      class: 'Администратор',
      isAdmin: true
    });

    await adminUser.save();
    
    res.json({
      message: 'Администратор успешно создан',
      username: 'admin',
      password: 'admin123'
    });
  } catch (err) {
    console.error('Ошибка при создании админа:', err);
    res.status(500).json({ message: err.message });
  }
});

// Получить список пользователей (только для админов)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const query = searchQuery ? {
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { fullName: { $regex: searchQuery, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить пользователя (только для админов)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.isAdmin) {
      return res.status(403).json({ message: 'Нельзя удалить администратора' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Пользователь удален' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить профиль пользователя
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('borrowedBooks.book');
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить детали пользователя (только для админов)
router.get('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'borrowedBooks.book',
        select: 'title author image'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Filter out any null book references
    user.borrowedBooks = user.borrowedBooks.filter(item => item && item.book);
    
    res.json(user);
  } catch (err) {
    console.error('Ошибка при получении данных пользователя:', err);
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
});

module.exports = router;
