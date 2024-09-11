const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  balanceInfo: {
    type: [{
      privateKey: {
        type: String,
        required: true
      },
      publicKey: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      balance: {
        type: Number,
        default: 0,
        min: 0
      },
      settled: {
        type: Boolean,
        default: false
      }
    }],
    default: [] // 确保 balanceInfo 默认是一个空数组
  },
  totalBalance: {
    type: Number,
    default: 0,
    min: 0
  }
});

userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
