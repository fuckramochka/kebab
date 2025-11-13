const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Підключення до бази з логуванням
const dbPath = path.resolve(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Помилка підключення до SQLite:', err.message);
    } else {
        console.log('✅ SQLite готова');
    }
});

// Створення таблиці
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS players (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            clicks INTEGER DEFAULT 0,
            totalClicks INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            clickPower INTEGER DEFAULT 1,
            autoClickers INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 0
        )
    `, (err) => {
        if (err) {
            console.error('❌ Помилка створення таблиці:', err.message);
        } else {
            console.log('✅ Таблиця players створена');
        }
    });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// API
app.post('/api/load', (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false });
    db.get(`SELECT * FROM players WHERE user_id = ?`, [user_id], (err, row) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, state: row || null });
    });
});

app.post('/api/save', (req, res) => {
    const { user_id, username, state } = req.body;
    if (!user_id || !state) return res.status(400).json({ success: false });
    const { clicks, totalClicks, level, clickPower, autoClickers, coins } = state;

    const stmt = db.prepare(`
        INSERT INTO players (user_id, username, clicks, totalClicks, level, clickPower, autoClickers, coins)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            username = excluded.username,
            clicks = excluded.clicks,
            totalClicks = excluded.totalClicks,
            level = excluded.level,
            clickPower = excluded.clickPower,
            autoClickers = excluded.autoClickers,
            coins = excluded.coins
    `);
    stmt.run([user_id, username || '', clicks, totalClicks, level, clickPower, autoClickers, coins], (err) => {
        stmt.finalize();
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/api/leaderboard', (req, res) => {
    db.all(`
        SELECT user_id, username, totalClicks 
        FROM players 
        ORDER BY totalClicks DESC 
        LIMIT 10
    `, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, leaderboard: rows });
    });
});

// Віддача гри
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Запуск на 0.0.0.0 (обов’язково для Render)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущено на порту ${PORT}`);
});