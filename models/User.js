const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExpiration: Date,
  name: { type: String, default: "" },
  city: { type: String, default: "" },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }]  // Связь с заказами
});

const User = mongoose.model('User', userSchema);
module.exports = User;
