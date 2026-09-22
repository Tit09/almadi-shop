'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { db } = require('../db');
const { signToken, requireAuth } = require('../lib/auth');
const { clean, normalizePhone } = require('../lib/utils');

/* Anti bruteforce sur la connexion : 8 tentatives / 15 min / IP. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const credentials = z.object({
  email: z.string().email('E-mail invalide').max(120),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum').max(100),
});

router.post('/register', loginLimiter, (req, res) => {
  const parsed = credentials
    .extend({
      name: z.string().min(2).max(80),
      phone: z.string().max(20).optional().or(z.literal('')),
    })
    .safeParse(req.body);

  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });

  const { name, email, password, phone } = parsed.data;
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });

  const hash = bcrypt.hashSync(password, 12);
  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)')
    .run(clean(name, 80), email.toLowerCase(), normalizePhone(phone), hash, 'customer');

  const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', loginLimiter, (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Identifiants invalides.' });

  const { email, password } = parsed.data;
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  // Message identique que l'e-mail existe ou non : on n'aide pas l'attaquant.
  const ok = row && row.is_active && bcrypt.compareSync(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(row.id);

  const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/password', requireAuth, (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.next || '');
  if (next.length < 8) return res.status(400).json({ error: 'Nouveau mot de passe : 8 caractères minimum.' });

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current, row.password_hash))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), req.user.id);
  res.json({ ok: true });
});

module.exports = router;
