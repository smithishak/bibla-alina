const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const pdfDir = path.join(uploadDir, 'pdfs');
const tempDir = path.join(uploadDir, 'temp');

[uploadDir, pdfDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        if (file.fieldname === 'pdf') {
            cb(null, path.join(__dirname, '..', 'public', 'uploads', 'pdfs'));
        } else if (file.fieldname === 'image') {
            cb(null, path.join(__dirname, '..', 'public', 'uploads', 'temp'));
        }
    },
    filename: function(req, file, cb) {
        // Keep original filename but make it safe
        const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${safeName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function(req, file, cb) {
        if (file.fieldname === 'pdf') {
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only PDF files are allowed!'));
            }
        } else if (file.fieldname === 'image') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only images are allowed!'));
            }
        }
    }
});

// Публичный маршрут для просмотра книг с поддержкой поиска и пагинации
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (search) {
      // Convert search to number if it's a year
      const yearSearch = parseInt(search);
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { genre: { $regex: search, $options: 'i' } },
          ...(yearSearch ? [{ year: yearSearch }] : [])
        ]
      };
    }
    
    const totalBooks = await Book.countDocuments(query);
    const totalPages = Math.ceil(totalBooks / limit);
    const books = await Book.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      books,
      currentPage: page,
      totalPages,
      totalBooks
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Маршрут для получения одной книги
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (book) {
            res.json(book);
        } else {
            res.status(404).json({ message: 'Книга не найдена' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Защищенные маршруты
router.post('/', authenticateToken, isAdmin, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Files received:', req.files); // Debug log

        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            year: req.body.year,
            genre: req.body.genre,
            quantity: parseInt(req.body.quantity) || 1,
            availableQuantity: parseInt(req.body.quantity) || 1
        });

        // Handle image upload
        if (req.files && req.files.image && req.files.image[0]) {
            book.image = {
                data: fs.readFileSync(req.files.image[0].path),
                contentType: req.files.image[0].mimetype
            };
            // Remove temporary image file
            fs.unlinkSync(req.files.image[0].path);
        }

        // Handle PDF upload
        if (req.files && req.files.pdf && req.files.pdf[0]) {
            console.log('Saving PDF:', req.files.pdf[0].path); // Debug log
            const relativePath = path.relative(
                path.join(__dirname, '..', 'public'),
                req.files.pdf[0].path
            ).replace(/\\/g, '/');
            book.pdfPath = '/' + relativePath;
            console.log('Saved PDF path:', book.pdfPath); // Debug log
        }

        const savedBook = await book.save();
        console.log('Book saved successfully:', savedBook); // Debug log
        res.status(201).json(savedBook);
    } catch (err) {
        console.error('Error saving book:', err);
        // Clean up files if there's an error
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            });
        }
        res.status(400).json({ message: err.message });
    }
});

router.patch('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (book) {
      if (req.body.title) book.title = req.body.title;
      if (req.body.author) book.author = req.body.author;
      if (req.body.year) book.year = req.body.year;
      if (req.body.genre) book.genre = req.body.genre;
      if (req.body.available !== undefined) book.available = req.body.available;
      
      const updatedBook = await book.save();
      res.json(updatedBook);
    } else {
      res.status(404).json({ message: 'Книга не найдена' });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Книга не найдена' });
        }

        // Delete PDF file if exists
        if (book.pdfPath) {
            const filePath = path.join(__dirname, '..', 'public', book.pdfPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await book.remove();
        res.json({ message: 'Книга удалена' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Маршрут для взятия книги
router.post('/:id/borrow', authenticateToken, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Книга не найдена' });
        }

        if (book.availableQuantity <= 0) {
            return res.status(400).json({ message: 'Все экземпляры книги заняты' });
        }

        book.availableQuantity -= 1;
        book.available = book.availableQuantity > 0;
        await book.save();

        // Добавляем книгу в список взятых у пользователя
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, {
            $push: {
                borrowedBooks: {
                    book: book._id,
                    borrowDate: new Date()
                }
            }
        });

        res.json({ message: 'Книга успешно взята', book });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Маршрут для возврата книги
router.post('/:id/return', authenticateToken, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ message: 'Книга не найдена' });
        }

        book.availableQuantity = Math.min(book.quantity, book.availableQuantity + 1);
        book.available = book.availableQuantity > 0;
        await book.save();

        // Удаляем книгу из списка взятых у пользователя
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, {
            $pull: {
                borrowedBooks: {
                    book: book._id
                }
            }
        });

        res.json({ message: 'Книга успешно возвращена', book });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Добавляем маршруты для получения файлов
router.get('/:id/image', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (book && book.image && book.image.data) {
            res.set({
                'Content-Type': book.image.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400'
            });
            // Отправляем данные как buffer
            res.send(Buffer.from(book.image.data));
        } else {
            // Отправляем дефолтное изображение
            res.sendFile(path.join(__dirname, '../public/images/default-book.jpg'));
        }
    } catch (err) {
        console.error('Ошибка при получении изображения:', err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book || !book.pdfPath) {
            return res.status(404).send('PDF not found');
        }

        const filePath = path.join(__dirname, '..', 'public', book.pdfPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('PDF file not found');
        }

        res.download(filePath, `${book.title}.pdf`);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
