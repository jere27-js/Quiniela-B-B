/**
 * db.js — Inicialización de la base de datos SQLite para Quiniela B&B
 */

const Database = require('better-sqlite3');
const path = require('path');
const worldcupData = require('./data/worldcup2026');

const DB_PATH = path.join(__dirname, 'quiniela.db');
const db = new Database(DB_PATH);

// WAL para mejor rendimiento concurrente
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== ESQUEMA ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    email        TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    is_admin     INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id          INTEGER PRIMARY KEY,
    group_name  TEXT    NOT NULL,
    home_team   TEXT    NOT NULL,
    away_team   TEXT    NOT NULL,
    match_date  TEXT    NOT NULL,
    home_score  INTEGER,
    away_score  INTEGER
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    match_id    INTEGER NOT NULL,
    home_score  INTEGER NOT NULL,
    away_score  INTEGER NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id),
    FOREIGN KEY (user_id)  REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id)
  );
`);

// ==================== SEED PARTIDOS ====================
const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
if (matchCount.count === 0) {
  const insertMatch = db.prepare(
    'INSERT INTO matches (id, group_name, home_team, away_team, match_date) VALUES (?, ?, ?, ?, ?)'
  );
  const insertAll = db.transaction((matchList) => {
    for (const m of matchList) {
      insertMatch.run(m.id, m.group, m.home, m.away, m.date);
    }
  });
  insertAll(worldcupData.matches);
  console.log(`✅  ${worldcupData.matches.length} partidos cargados en la base de datos`);
}

module.exports = db;
