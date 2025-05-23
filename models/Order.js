const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryTime: String,
    name: { type: String, required: true },
    address: { type: String, required: true },
    additionalInfo: { type: String },
    createdAt: { type: Date, default: Date.now },  // Время оформления заказа
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        }
    ],
    totalAmount: { type: Number, required: true }  // Общая сумма
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
