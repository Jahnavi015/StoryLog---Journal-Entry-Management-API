require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const authRoutes = require('./auth');
const auth = require('./middleware/auth');
const authMiddleware = require('./middleware/auth');
const validateEntry = require('./middleware/validateEntry');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use(authRoutes);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const calcMoodScore = tags => Math.max(-5, Math.min(tags.length, 5));

// Apply auth to all /entries routes
app.use('/entries', auth);

// Create Entry
app.post('/entries', auth, logger, validateEntry, async (req, res, next) => {
  try {
    const { title, body, moodTags } = req.body;
    const wordCount = body.split(' ').length;
    await db.execute(
      `INSERT INTO entries (title, body, moodTags, moodScore, wordCount, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, body, JSON.stringify(moodTags), calcMoodScore(moodTags), wordCount, req.userId]
    );
    res.json({ message: 'Created' });
  } catch (err) {
    next(err);
  }
});

// Update Entry
app.put('/entries/:id', auth, logger, validateEntry, async (req, res, next) => {
  try {
    const { title, body, moodTags } = req.body;
    const wordCount = body.split(' ').length;
    const [result] = await db.execute(
      `UPDATE entries SET title=?, body=?, moodTags=?, moodScore=?, wordCount=? WHERE id=? AND createdBy=?`,
      [title, body, JSON.stringify(moodTags), calcMoodScore(moodTags), wordCount, req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: false, message: 'Entry not found or not authorized' });
    }
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// Delete Entry
app.delete('/entries/:id', auth, logger, async (req, res, next) => {
  try {
    const [result] = await db.execute(
      `DELETE FROM entries WHERE id=? AND createdBy=?`,
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: false, message: 'Entry not found or not authorized' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

app.get('/entries', auth, async (req, res, next) => {
  try {
    const { tag, start, end, keyword } = req.query;
    let query = 'SELECT * FROM entries WHERE createdBy = ?';
    let params = [req.userId];

    if (tag) {
      query += ' AND JSON_CONTAINS(moodTags, ?)';
      params.push(`"${tag}"`);
    }
    if (start) {
      query += ' AND date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND date <= ?';
      params.push(end);
    }
    if (keyword) {
      const kw = `%${keyword}%`;
      query += ' AND (title LIKE ? OR body LIKE ?)';
      params.push(kw, kw);
    }

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get Summary
app.get('/entries/summary', auth, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT moodTags, moodScore, wordCount FROM entries WHERE createdBy = ?`,
      [req.userId]
    );

    const total = rows.length;
    const wordCount = rows.reduce((sum, r) => sum + r.wordCount, 0);
    const avgMood = total ? rows.reduce((sum, r) => sum + r.moodScore, 0) / total : 0;
    const allTags = rows.flatMap(r => JSON.parse(r.moodTags));
    const topMood = Object.entries(
      allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {})
    )
    .sort((a, b) => b[1] - a[1])[0]?.[0];

    res.json({ total, wordCount, avgMood, topMood });
  } catch (err) {
    next(err);
  }
});
app.use(errorHandler);

// Start server
app.listen(3000, () => console.log('✅ API running at http://localhost:3000')); 