const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    year: Number,
    genre: String,
    quantity: { type: Number, default: 1 },
    availableQuantity: { type: Number, default: 1 },
    available: { type: Boolean, default: true },
    image: { data: Buffer, contentType: String },
    pdf: { data: Buffer, contentType: String }, // Store PDF directly in database
    pdfPath: String, // Store the path to PDF file
    borrowedBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('Book', bookSchema);
