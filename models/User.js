const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExpiration: Date,
  name: { type: String, default: "" },
  city: { type: String, default: "" },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

  // 👇 Добавь это внутрь схемы
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  pendingEmail: { type: String, default: null }
});


const User = mongoose.model('User', userSchema);
module.exports = User;
