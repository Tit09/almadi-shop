'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'almadi.db'));

// Fiabilité + performance : WAL permet lectures concurrentes pendant les écritures.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',   -- customer | admin
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image       TEXT,
  icon        TEXT,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  season      TEXT,             -- ete | ramadan | decembre | rentree | toute_saison
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  sku           TEXT UNIQUE,
  short_desc    TEXT,
  description   TEXT,
  price         INTEGER NOT NULL DEFAULT 0,      -- en GNF, entier
  compare_price INTEGER,                          -- prix barré (promo)
  cost_price    INTEGER,                          -- prix d'achat (marge admin)
  stock         INTEGER NOT NULL DEFAULT 0,
  low_stock     INTEGER NOT NULL DEFAULT 3,
  track_stock   INTEGER NOT NULL DEFAULT 1,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  season        TEXT,
  brand         TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | draft | archived
  is_featured   INTEGER NOT NULL DEFAULT 0,      -- produit phare (mis en avant)
  is_new        INTEGER NOT NULL DEFAULT 0,
  views         INTEGER NOT NULL DEFAULT 0,
  sold_count    INTEGER NOT NULL DEFAULT 0,
  rating_sum    INTEGER NOT NULL DEFAULT 0,
  rating_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,            -- taille | couleur
  value       TEXT NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  price_delta INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  region     TEXT NOT NULL DEFAULT 'Conakry',
  fee        INTEGER NOT NULL DEFAULT 0,
  delay      TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL DEFAULT 'percent',  -- percent | fixed | free_shipping
  value         INTEGER NOT NULL DEFAULT 0,
  min_total     INTEGER NOT NULL DEFAULT 0,
  max_uses      INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  expires_at    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT NOT NULL UNIQUE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  address         TEXT NOT NULL,
  zone_id         INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL,
  zone_name       TEXT,
  landmark        TEXT,
  note            TEXT,
  subtotal        INTEGER NOT NULL DEFAULT 0,
  delivery_fee    INTEGER NOT NULL DEFAULT 0,
  discount        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  coupon_code     TEXT,
  payment_method  TEXT NOT NULL,                  -- wave | orange_money | card | cash
  payment_status  TEXT NOT NULL DEFAULT 'pending',-- pending | paid | failed | refunded
  payment_ref     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',-- pending | confirmed | packed | shipped | delivered | cancelled
  cancel_reason   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  image        TEXT,
  unit_price   INTEGER NOT NULL,
  quantity     INTEGER NOT NULL,
  variant      TEXT,
  line_total   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status    TEXT NOT NULL,
  message   TEXT,
  author    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  rating     INTEGER NOT NULL,
  comment    TEXT,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  cta_label  TEXT,
  cta_link   TEXT,
  image      TEXT,
  theme      TEXT DEFAULT 'gold',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS newsletter (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_season   ON products(season);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_items_order       ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_images_product    ON product_images(product_id);
`);

/* ------------------------------------------------------------------ */
/* Paramètres de la boutique                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  shop_name: 'Almadi Shop',
  shop_tagline: 'Mode femme & fournitures — livrées à Conakry',
  currency: 'GNF',
  phone: '+224 625 00 33 39',
  whatsapp: '224625003339',
  email: 'contact@almadishop.com',
  address: 'Conakry, République de Guinée',
  facebook: '',
  instagram: '',
  tiktok: '',
  free_shipping_from: '1500000',
  active_season: 'rentree',
  announcement: "Livraison rapide dans tout Conakry · Paiement à la livraison disponible",
  pay_wave: '1',
  pay_orange_money: '1',
  pay_card: '1',
  pay_cash: '1',
  wave_number: '+224 625 00 33 39',
  orange_money_number: '+224 625 00 33 39',
  low_stock_alert: '3',
};

const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
const putSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

function seedDefaultSettings() {
  const insertIfMissing = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) insertIfMissing.run(k, String(v));
  });
  tx(Object.entries(DEFAULT_SETTINGS));
}
seedDefaultSettings();

function settings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function setSetting(key, value) {
  putSetting.run(key, value == null ? '' : String(value));
}

module.exports = { db, settings, setSetting, getSetting, DEFAULT_SETTINGS, DATA_DIR };
