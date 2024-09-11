require('dotenv').config();
const User = require('../models/user');
const jwt = require('jsonwebtoken');

const getLogin = (req, res) => {
  res.render('login');
}

const postLogin = async (req, res) => {
  const { username, password } = req.body;

  // 验证用户是否存在
  const user = await User.findOne({ username, password });

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // 用户认证成功后，生成 JWT
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 设置 Cookie 以存储 JWT
  res.cookie('token', token, { httpOnly: true });

  // 设置 Cookie 以存储用户名
  res.cookie('username', username, { httpOnly: true });

  return res.json({ success: true, message: 'Login successful' });
}

const getRegister = (req, res) => {
  res.render('register');
}

const postRegister = async (req, res) => {
  const { username, password } = req.body;

  // 创建新用户
  const newUser = new User({ username, password });
  await newUser.save();

  return res.json({ success: true, message: 'Registration successful' });
}

const getLogout = (req, res) => {
  // 清除 Cookie
  res.clearCookie('token');
  res.clearCookie('username');
  res.json({ success: true, message: 'Logout successful' });
}

const getProtected = (req, res) => {
  const username = req.cookies.username;

  if (!username) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  res.render('protected', { username });
}

module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  getLogout,
  getProtected
};