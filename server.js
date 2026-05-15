/**
 * server.js — Servidor principal Quiniela Mundialista B&B
 * Copa del Mundo 2026
 */

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ==================== RATE LIMITERS ====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  }
}));

// ==================== CSRF PROTECTION ====================
// Genera un token por sesión y lo valida en peticiones que modifican estado.
function generateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Token de seguridad inválido. Recarga la página.' });
  }
  next();
}

// Endpoint para obtener el CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req) });
});

// ==================== HELPERS ====================
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado. Por favor inicia sesión.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
}

/**
 * Calcula los puntos de una predicción:
 *   3 pts → resultado exacto
 *   1 pt  → ganador/empate correcto sin resultado exacto
 *   0 pts → incorrecto
 */
function calcPoints(predHome, predAway, actHome, actAway) {
  if (predHome === actHome && predAway === actAway) return 3;
  const predOutcome = Math.sign(predHome - predAway);
  const actOutcome  = Math.sign(actHome  - actAway);
  return predOutcome === actOutcome ? 1 : 0;
}

// ==================== AUTH ====================

// Registrar nuevo usuario
app.post('/api/auth/register', authLimiter, csrfProtect, (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Ese correo ya está registrado. Intenta iniciar sesión.' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run(name.trim(), email.toLowerCase().trim(), hash);

    req.session.userId   = result.lastInsertRowid;
    req.session.userName = name.trim();
    req.session.isAdmin  = false;

    return res.json({ success: true, user: { id: result.lastInsertRowid, name: name.trim(), isAdmin: false } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Error interno al registrar. Intenta de nuevo.' });
  }
});

// Iniciar sesión
app.post('/api/auth/login', authLimiter, csrfProtect, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    req.session.userId   = user.id;
    req.session.userName = user.name;
    req.session.isAdmin  = user.is_admin === 1;

    return res.json({ success: true, user: { id: user.id, name: user.name, isAdmin: user.is_admin === 1 } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
});

// Cerrar sesión
app.post('/api/auth/logout', csrfProtect, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Usuario actual
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.prepare('SELECT id, name, email, is_admin FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.json({ user: null });
  }
  return res.json({ user: { id: user.id, name: user.name, isAdmin: user.is_admin === 1 } });
});

// ==================== PARTIDOS ====================

// Todos los partidos
app.get('/api/matches', (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_date, id').all();
  res.json({ matches });
});

// Partidos por grupo
app.get('/api/matches/group/:group', (req, res) => {
  const group = req.params.group.toUpperCase();
  const matches = db.prepare(
    'SELECT * FROM matches WHERE group_name = ? ORDER BY match_date, id'
  ).all(group);
  res.json({ matches });
});

// Lista de grupos disponibles
app.get('/api/groups', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT group_name FROM matches ORDER BY group_name'
  ).all();
  res.json({ groups: rows.map(r => r.group_name) });
});

// ==================== PREDICCIONES ====================

// Obtener predicciones del usuario
app.get('/api/predictions', requireAuth, (req, res) => {
  const preds = db.prepare(`
    SELECT p.*, m.home_team, m.away_team, m.match_date, m.group_name,
           m.home_score AS actual_home, m.away_score AS actual_away
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.user_id = ?
    ORDER BY m.match_date
  `).all(req.session.userId);
  res.json({ predictions: preds });
});

// Guardar predicciones en bulk (por grupo)
app.post('/api/predictions/bulk', requireAuth, csrfProtect, (req, res) => {
  const { predictions } = req.body;

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return res.status(400).json({ error: 'No se recibieron predicciones.' });
  }

  const now = new Date();
  const errors = [];
  const saved  = [];

  const upsert = db.prepare(`
    INSERT INTO predictions (user_id, match_id, home_score, away_score)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET home_score = excluded.home_score,
                  away_score = excluded.away_score,
                  updated_at = CURRENT_TIMESTAMP
  `);

  const processBulk = db.transaction((preds) => {
    for (const pred of preds) {
      const { match_id, home_score, away_score } = pred;

      if (match_id === undefined || home_score === undefined || away_score === undefined) {
        errors.push(`Predicción incompleta (match_id=${match_id})`);
        continue;
      }

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(Number(match_id));
      if (!match) {
        errors.push(`Partido ${match_id} no encontrado`);
        continue;
      }

      // Restricción: solo se puede predecir hasta 24h antes del partido
      const matchDate  = new Date(match.match_date);
      const deadline   = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
      if (now >= deadline) {
        errors.push(`Ya cerró el tiempo para predecir: ${match.home_team} vs ${match.away_team}`);
        continue;
      }

      const hs = parseInt(home_score, 10);
      const as = parseInt(away_score, 10);
      if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
        errors.push(`Puntaje inválido para ${match.home_team} vs ${match.away_team}`);
        continue;
      }

      upsert.run(req.session.userId, Number(match_id), hs, as);
      saved.push(Number(match_id));
    }
  });

  processBulk(predictions);
  return res.json({ success: true, saved, errors });
});

// ==================== TABLA DE POSICIONES ====================

app.get('/api/leaderboard', (req, res) => {
  const users   = db.prepare('SELECT id, name FROM users WHERE is_admin = 0 ORDER BY name').all();
  const played  = db.prepare('SELECT * FROM matches WHERE home_score IS NOT NULL AND away_score IS NOT NULL').all();
  const total   = db.prepare('SELECT COUNT(*) AS cnt FROM matches').get().cnt;

  const maxPossiblePoints = total * 3;

  const leaderboard = users.map(user => {
    let points  = 0;
    let exact   = 0;
    let outcome = 0;
    let pending = 0;

    for (const match of played) {
      const pred = db.prepare(
        'SELECT * FROM predictions WHERE user_id = ? AND match_id = ?'
      ).get(user.id, match.id);

      if (!pred) { pending++; continue; }

      const pts = calcPoints(pred.home_score, pred.away_score, match.home_score, match.away_score);
      points += pts;
      if (pts === 3) exact++;
      else if (pts === 1) outcome++;
    }

    return {
      userId:     user.id,
      name:       user.name,
      points,
      exact,
      outcome,
      pending,
      playedMatches: played.length,
      totalMatches:  total,
      percentage: maxPossiblePoints > 0
        ? Math.min(100, Math.round((points / maxPossiblePoints) * 100))
        : 0,
    };
  });

  leaderboard.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  leaderboard.forEach((e, i) => { e.rank = i + 1; });

  return res.json({ leaderboard, playedMatches: played.length, totalMatches: total, maxPossiblePoints });
});

// Puntos del usuario actual
app.get('/api/leaderboard/me', requireAuth, (req, res) => {
  const played = db.prepare('SELECT * FROM matches WHERE home_score IS NOT NULL AND away_score IS NOT NULL').all();
  const total  = db.prepare('SELECT COUNT(*) AS cnt FROM matches').get().cnt;

  let points = 0, exact = 0, outcome = 0;
  for (const match of played) {
    const pred = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(req.session.userId, match.id);
    if (!pred) continue;
    const pts = calcPoints(pred.home_score, pred.away_score, match.home_score, match.away_score);
    points += pts;
    if (pts === 3) exact++;
    else if (pts === 1) outcome++;
  }

  const maxPossible = total * 3;
  return res.json({
    points,
    exact,
    outcome,
    playedMatches: played.length,
    totalMatches: total,
    percentage: maxPossible > 0 ? Math.min(100, Math.round((points / maxPossible) * 100)) : 0,
  });
});

// ==================== ADMINISTRADOR ====================

// Login admin
app.post('/api/admin/login', authLimiter, csrfProtect, (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'QuinielaBB2026!';

  if (password !== adminPass) {
    return res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
  }
  req.session.isAdmin = true;
  return res.json({ success: true });
});

// Obtener todos los partidos (admin)
app.get('/api/admin/matches', requireAdmin, (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_date, id').all();
  res.json({ matches });
});

// Actualizar resultado de un partido
app.put('/api/admin/matches/:id/result', requireAdmin, csrfProtect, (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'Se requieren home_score y away_score.' });
  }

  const hs = parseInt(home_score, 10);
  const as = parseInt(away_score, 10);
  if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
    return res.status(400).json({ error: 'Puntajes inválidos.' });
  }

  try {
    const info = db.prepare('UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?').run(hs, as, matchId);
    if (info.changes === 0) return res.status(404).json({ error: 'Partido no encontrado.' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin result error:', err);
    return res.status(500).json({ error: 'Error al actualizar resultado.' });
  }
});

// Limpiar resultado de un partido
app.delete('/api/admin/matches/:id/result', requireAdmin, csrfProtect, (req, res) => {
  const matchId = parseInt(req.params.id, 10);
  try {
    db.prepare('UPDATE matches SET home_score = NULL, away_score = NULL WHERE id = ?').run(matchId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error al limpiar resultado.' });
  }
});

// ==================== ARRANQUE ====================
app.listen(PORT, () => {
  console.log(`🌍  Quiniela B&B 2026 — http://localhost:${PORT}`);
});
