// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Шлях до бази даних (важливо для Render)
const dbPath = path.resolve(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath);

// Створення таблиці гравців
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
    `);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend'))); // Віддаємо статичні файли

// === API ===
app.post('/api/load', (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.json({ success: false, error: "No user_id" });

    db.get(`SELECT * FROM players WHERE user_id = ?`, [user_id], (err, row) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, state: row || null });
    });
});

app.post('/api/save', (req, res) => {
    const { user_id, username, state } = req.body;
    if (!user_id || !state) return res.json({ success: false });

    const { clicks, totalClicks, level, clickPower, autoClickers, coins } = state;

    const sql = db.prepare(`
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
    sql.run([user_id, username || '', clicks, totalClicks, level, clickPower, autoClickers, coins], (err) => {
        sql.finalize();
        if (err) return res.json({ success: false });
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
        if (err) return res.json({ success: false });
        res.json({ success: true, leaderboard: rows });
    });
});

// === Віддача фронтенду (гри) ===
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Запуск
app.listen(PORT, () => {
    console.log(`✅ Сервер запущено: http://localhost:${PORT}`);
});