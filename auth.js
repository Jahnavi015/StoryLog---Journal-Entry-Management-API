const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Register
router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ status: false, message: 'All fields required' });

  const hashed = await bcrypt.hash(password, 10);
  try {
    await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
    res.json({ status: true, message: 'User registered' });
  } catch {
    res.status(400).json({ status: false, message: 'Email already used' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length) return res.status(400).json({ status: false, message: 'Invalid credentials' });

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ status: false, message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
  res.json({ status: true, token });
});

module.exports = router;
