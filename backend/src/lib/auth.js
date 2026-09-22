'use strict';

const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 24) {
  // On refuse de démarrer avec un secret faible : c'est la clé de toutes les sessions.
  throw new Error(
    'JWT_SECRET manquant ou trop court (32 caractères minimum). Voir backend/.env.example'
  );
}
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES, issuer: 'almadi-shop' }
  );
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.almadi_token) return req.cookies.almadi_token;
  return null;
}

/** Charge req.user si un token valide est présent, sans bloquer. */
function attachUser(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'almadi-shop' });
    const user = db
      .prepare('SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?')
      .get(payload.sub);
    if (user && user.is_active) req.user = user;
  } catch (_) {
    /* token expiré ou falsifié : on continue en invité */
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé à l’administration.' });
  next();
}

module.exports = { signToken, attachUser, requireAuth, requireAdmin, JWT_SECRET };
