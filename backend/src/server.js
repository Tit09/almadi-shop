'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { attachUser } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Derrière Nginx : indispensable pour que le rate-limit voie la vraie IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ---------------------------------------------------------------- */
/* Sécurité                                                          */
/* ---------------------------------------------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // images servies au front
    contentSecurityPolicy: NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    } : false,
  })
);

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin) || origins.includes('*')) return cb(null, true);
      cb(new Error('Origine non autorisée par la politique CORS.'));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (NODE_ENV !== 'test') app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Garde-fou global contre l'abus d'API.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, patientez quelques instants.' },
  })
);

app.use(attachUser);

/* ---------------------------------------------------------------- */
/* Fichiers envoyés depuis le panel admin                            */
/* ---------------------------------------------------------------- */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '30d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

/* ---------------------------------------------------------------- */
/* Routes                                                            */
/* ---------------------------------------------------------------- */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'almadi-shop-api', env: NODE_ENV, time: new Date().toISOString() })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/shop'));

/* ---------------------------------------------------------------- */
/* Front compilé (déploiement mono-serveur)                          */
/* ---------------------------------------------------------------- */
const DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '7d', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[erreur]', err);
  res.status(status).json({
    error:
      status >= 500 && NODE_ENV === 'production'
        ? 'Une erreur interne est survenue. Réessayez.'
        : err.message,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Almadi Shop API — http://localhost:${PORT}`);
    console.log(`  Environnement : ${NODE_ENV}`);
    console.log(`  Origines autorisées : ${origins.join(', ')}\n`);
  });
}

module.exports = app;
