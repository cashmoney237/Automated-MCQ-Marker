const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';
const users = {}; // in-memory user store

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (Object.values(users).find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    users[userId] = { id: userId, name, email, passwordHash: hashed, createdAt: new Date().toISOString() };
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: userId, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = Object.values(users).find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = users[req.user.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

module.exports = { router, users };
