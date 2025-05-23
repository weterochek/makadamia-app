const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    // Добавьте другие поля, если необходимо
});

const Product = mongoose.model('Product', productSchema); // Убедитесь, что модель называется 'Products'

module.exports = Product;
