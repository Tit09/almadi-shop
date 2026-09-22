'use strict';

const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const { db, settings, setSetting, DEFAULT_SETTINGS } = require('../db');
const P = require('../lib/products');
const { requireAdmin } = require('../lib/auth');
const { uniqueSlug, clean, toInt, toBool } = require('../lib/utils');

router.use(requireAdmin); // tout ce fichier est protégé

/* ================================================================ */
/* 1. Tableau de bord                                                */
/* ================================================================ */
router.get('/stats', (_req, res) => {
  const one = (sql, ...args) => db.prepare(sql).get(...args);

  const revenue = one(
    `SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status <> 'cancelled'`
  ).total;
  const revenuePaid = one(
    `SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE payment_status = 'paid'`
  ).total;
  const today = one(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM orders
     WHERE date(created_at) = date('now') AND status <> 'cancelled'`
  );
  const month = one(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total FROM orders
     WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now') AND status <> 'cancelled'`
  );

  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')
    .all()
    .reduce((a, r) => ({ ...a, [r.status]: r.n }), {});

  const chartRows = db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE created_at >= datetime('now','-13 days') AND status <> 'cancelled'
       GROUP BY day ORDER BY day`
    )
    .all();

  // On complète les journées sans vente : un graphique à trous est illisible.
  const byDay = new Map(chartRows.map((r) => [r.day, r]));
  const chart = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chart.push(byDay.get(key) || { day: key, orders: 0, revenue: 0 });
  }

  const topProducts = db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.price, p.stock, p.sold_count,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image,
              COALESCE(SUM(oi.quantity),0) AS qty,
              COALESCE(SUM(oi.line_total),0) AS revenue
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
       GROUP BY p.id ORDER BY qty DESC, p.sold_count DESC LIMIT 8`
    )
    .all();

  const lowStock = P.search({ status: 'all', lowStockOnly: true, sort: 'stock_asc', limit: 12 }).items;

  const recentOrders = db
    .prepare(
      `SELECT id, order_number, customer_name, phone, total, status, payment_status, payment_method, created_at
       FROM orders ORDER BY id DESC LIMIT 10`
    )
    .all();

  res.json({
    revenue,
    revenuePaid,
    today: { orders: today.n, revenue: today.total },
    month: { orders: month.n, revenue: month.total },
    counts: {
      orders: one('SELECT COUNT(*) AS n FROM orders').n,
      products: one('SELECT COUNT(*) AS n FROM products').n,
      outOfStock: one('SELECT COUNT(*) AS n FROM products WHERE track_stock = 1 AND stock <= 0').n,
      customers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").n,
      pendingReviews: one('SELECT COUNT(*) AS n FROM reviews WHERE is_approved = 0').n,
    },
    byStatus,
    chart,
    topProducts,
    lowStock,
    recentOrders,
  });
});

/* ================================================================ */
/* 2. Produits                                                       */
/* ================================================================ */
router.get('/products', (req, res) => {
  res.json(
    P.search({
      q: clean(req.query.q, 60),
      category: clean(req.query.category, 80),
      season: clean(req.query.season, 30),
      status: req.query.status || 'all',
      sort: req.query.sort || 'recent',
      page: req.query.page,
      limit: req.query.limit || 20,
      lowStockOnly: req.query.low === '1',
    })
  );
});

router.get('/products/:id', (req, res) => {
  const p = P.findById(toInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json(p);
});

function writeProduct(body, id = null) {
  const name = clean(body.name, 140);
  if (!name) throw Object.assign(new Error('Le nom du produit est obligatoire.'), { status: 400 });

  const data = {
    name,
    slug: uniqueSlug(db, 'products', body.slug || name, id),
    sku: clean(body.sku, 40),
    short_desc: clean(body.shortDesc, 200),
    description: clean(body.description, 5000),
    price: toInt(body.price),
    compare_price: body.comparePrice ? toInt(body.comparePrice) : null,
    cost_price: body.costPrice ? toInt(body.costPrice) : null,
    stock: toInt(body.stock),
    low_stock: toInt(body.lowStock, 3),
    track_stock: toBool(body.trackStock ?? 1),
    category_id: body.categoryId ? toInt(body.categoryId) : null,
    season: clean(body.season, 30),
    brand: clean(body.brand, 60),
    tags: Array.isArray(body.tags) ? body.tags.join(',').slice(0, 300) : clean(body.tags, 300),
    status: ['active', 'draft', 'archived'].includes(body.status) ? body.status : 'active',
    is_featured: toBool(body.isFeatured),
    is_new: toBool(body.isNew),
  };

  const tx = db.transaction(() => {
    let productId = id;
    if (id) {
      db.prepare(
        `UPDATE products SET name=@name, slug=@slug, sku=@sku, short_desc=@short_desc,
         description=@description, price=@price, compare_price=@compare_price, cost_price=@cost_price,
         stock=@stock, low_stock=@low_stock, track_stock=@track_stock, category_id=@category_id,
         season=@season, brand=@brand, tags=@tags, status=@status, is_featured=@is_featured,
         is_new=@is_new, updated_at=datetime('now') WHERE id=@id`
      ).run({ ...data, id });
    } else {
      const info = db
        .prepare(
          `INSERT INTO products (name, slug, sku, short_desc, description, price, compare_price, cost_price,
            stock, low_stock, track_stock, category_id, season, brand, tags, status, is_featured, is_new)
           VALUES (@name,@slug,@sku,@short_desc,@description,@price,@compare_price,@cost_price,
            @stock,@low_stock,@track_stock,@category_id,@season,@brand,@tags,@status,@is_featured,@is_new)`
        )
        .run(data);
      productId = info.lastInsertRowid;
    }

    if (Array.isArray(body.images)) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      const ins = db.prepare('INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)');
      body.images.filter(Boolean).slice(0, 8).forEach((url, i) => ins.run(productId, String(url).slice(0, 300), i));
    }

    if (body.variants && typeof body.variants === 'object') {
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
      const ins = db.prepare(
        'INSERT INTO product_variants (product_id, kind, value, stock, price_delta) VALUES (?,?,?,?,?)'
      );
      for (const [kind, list] of Object.entries(body.variants)) {
        if (!Array.isArray(list)) continue;
        for (const v of list.slice(0, 20)) {
          const value = clean(typeof v === 'string' ? v : v.value, 40);
          if (!value) continue;
          ins.run(productId, clean(kind, 20), value, toInt(v.stock, 0), toInt(v.priceDelta, 0));
        }
      }
    }
    return productId;
  });

  return P.findById(tx());
}

router.post('/products', (req, res, next) => {
  try {
    res.status(201).json(writeProduct(req.body));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

router.put('/products/:id', (req, res, next) => {
  const id = toInt(req.params.id);
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Produit introuvable.' });
  try {
    res.json(writeProduct(req.body, id));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

/** Raccourcis du panel : stock, rupture, mise en avant, statut. */
router.patch('/products/:id', (req, res) => {
  const id = toInt(req.params.id);
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'Produit introuvable.' });

  const fields = [];
  const params = { id };
  const set = (col, val) => { fields.push(`${col} = @${col}`); params[col] = val; };

  if (req.body.stock !== undefined) set('stock', Math.max(toInt(req.body.stock), 0));
  if (req.body.outOfStock !== undefined) set('stock', toBool(req.body.outOfStock) ? 0 : Math.max(p.stock, 1));
  if (req.body.isFeatured !== undefined) set('is_featured', toBool(req.body.isFeatured));
  if (req.body.isNew !== undefined) set('is_new', toBool(req.body.isNew));
  if (req.body.price !== undefined) set('price', toInt(req.body.price));
  if (req.body.status !== undefined && ['active', 'draft', 'archived'].includes(req.body.status))
    set('status', req.body.status);

  if (!fields.length) return res.status(400).json({ error: 'Aucune modification fournie.' });

  db.prepare(`UPDATE products SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  res.json(P.findById(id));
});

router.delete('/products/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(toInt(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json({ ok: true });
});

/* ================================================================ */
/* 3. Catégories                                                     */
/* ================================================================ */
router.get('/categories', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
         FROM categories c ORDER BY c.sort_order, c.name`
      )
      .all()
  );
});

router.post('/categories', (req, res) => {
  const name = clean(req.body.name, 80);
  if (!name) return res.status(400).json({ error: 'Nom obligatoire.' });
  const info = db
    .prepare(
      `INSERT INTO categories (name, slug, description, image, icon, parent_id, season, sort_order, is_active)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      name,
      uniqueSlug(db, 'categories', req.body.slug || name),
      clean(req.body.description, 400),
      clean(req.body.image, 300),
      clean(req.body.icon, 40),
      req.body.parentId ? toInt(req.body.parentId) : null,
      clean(req.body.season, 30),
      toInt(req.body.sortOrder),
      toBool(req.body.isActive ?? 1)
    );
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/categories/:id', (req, res) => {
  const id = toInt(req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable.' });
  const name = clean(req.body.name, 80) || cat.name;
  db.prepare(
    `UPDATE categories SET name=?, slug=?, description=?, image=?, icon=?, parent_id=?, season=?,
     sort_order=?, is_active=? WHERE id=?`
  ).run(
    name,
    uniqueSlug(db, 'categories', req.body.slug || name, id),
    clean(req.body.description, 400),
    clean(req.body.image, 300),
    clean(req.body.icon, 40),
    req.body.parentId ? toInt(req.body.parentId) : null,
    clean(req.body.season, 30),
    toInt(req.body.sortOrder),
    toBool(req.body.isActive ?? 1),
    id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

router.delete('/categories/:id', (req, res) => {
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(toInt(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Catégorie introuvable.' });
  res.json({ ok: true });
});

/* ================================================================ */
/* 4. Commandes                                                      */
/* ================================================================ */
const ORDER_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

router.get('/orders', (req, res) => {
  const where = [];
  const params = {};
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
    where.push('status = @status'); params.status = req.query.status;
  }
  if (req.query.payment && PAYMENT_STATUSES.includes(req.query.payment)) {
    where.push('payment_status = @payment'); params.payment = req.query.payment;
  }
  if (req.query.q) {
    where.push('(order_number LIKE @q OR customer_name LIKE @q OR phone LIKE @q)');
    params.q = `%${clean(req.query.q, 40)}%`;
  }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(toInt(req.query.limit, 20), 100);
  const page = Math.max(toInt(req.query.page, 1), 1);

  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders ${clause}`).get(params).n;
  const rows = db
    .prepare(`SELECT * FROM orders ${clause} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset: (page - 1) * limit });

  res.json({
    items: rows.map((o) => ({
      ...o,
      itemCount: db.prepare('SELECT COALESCE(SUM(quantity),0) AS n FROM order_items WHERE order_id = ?').get(o.id).n,
    })),
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
});

router.get('/orders/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(toInt(req.params.id));
  if (!o) return res.status(404).json({ error: 'Commande introuvable.' });
  res.json({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
    events: db.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').all(o.id),
  });
});

router.patch('/orders/:id', (req, res) => {
  const id = toInt(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

  const { status, paymentStatus, paymentRef, note } = req.body;
  const tx = db.transaction(() => {
    if (status && ORDER_STATUSES.includes(status) && status !== order.status) {
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
      db.prepare('INSERT INTO order_events (order_id, status, message, author) VALUES (?,?,?,?)').run(
        id, status, LABELS[status], req.user.name
      );
      // Annulation : on remet les articles en stock.
      if (status === 'cancelled') {
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(id);
        for (const it of items) {
          if (it.product_id)
            db.prepare(
              'UPDATE products SET stock = stock + ?, sold_count = MAX(sold_count - ?, 0) WHERE id = ? AND track_stock = 1'
            ).run(it.quantity, it.quantity, it.product_id);
        }
      }
    }
    if (paymentStatus && PAYMENT_STATUSES.includes(paymentStatus)) {
      db.prepare("UPDATE orders SET payment_status = ?, payment_ref = ?, updated_at = datetime('now') WHERE id = ?")
        .run(paymentStatus, clean(paymentRef, 80) || order.payment_ref, id);
    }
    if (note) {
      db.prepare('INSERT INTO order_events (order_id, status, message, author) VALUES (?,?,?,?)').run(
        id, order.status, clean(note, 300), req.user.name
      );
    }
  });
  tx();

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json({
    ...updated,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id),
    events: db.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').all(id),
  });
});

const LABELS = {
  pending: 'Commande en attente de confirmation.',
  confirmed: 'Commande confirmée par téléphone.',
  packed: 'Colis préparé et emballé.',
  shipped: 'Colis remis au livreur.',
  delivered: 'Commande livrée au client.',
  cancelled: 'Commande annulée.',
};

/* ================================================================ */
/* 5. Clients, avis, newsletter                                      */
/* ================================================================ */
router.get('/customers', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT u.id, u.name, u.email, u.phone, u.created_at, u.last_login_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
                (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id = u.id AND o.status <> 'cancelled') AS spent
         FROM users u WHERE u.role = 'customer' ORDER BY u.id DESC LIMIT 200`
      )
      .all()
  );
});

/** Clients "invités" : ceux qui ont commandé sans créer de compte. */
router.get('/guests', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT customer_name AS name, phone, COUNT(*) AS orders, COALESCE(SUM(total),0) AS spent,
                MAX(created_at) AS last_order
         FROM orders WHERE user_id IS NULL GROUP BY phone ORDER BY last_order DESC LIMIT 200`
      )
      .all()
  );
});

router.get('/reviews', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT r.*, p.name AS product_name FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id ORDER BY r.is_approved, r.id DESC LIMIT 200`
      )
      .all()
  );
});

router.patch('/reviews/:id', (req, res) => {
  const id = toInt(req.params.id);
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'Avis introuvable.' });
  const approve = toBool(req.body.isApproved);
  if (approve && !r.is_approved) {
    db.prepare('UPDATE products SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?')
      .run(r.rating, r.product_id);
  } else if (!approve && r.is_approved) {
    db.prepare('UPDATE products SET rating_sum = MAX(rating_sum - ?,0), rating_count = MAX(rating_count - 1,0) WHERE id = ?')
      .run(r.rating, r.product_id);
  }
  db.prepare('UPDATE reviews SET is_approved = ? WHERE id = ?').run(approve, id);
  res.json({ ok: true });
});

router.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(toInt(req.params.id));
  res.json({ ok: true });
});

router.get('/newsletter', (_req, res) => {
  res.json(db.prepare('SELECT * FROM newsletter ORDER BY id DESC LIMIT 500').all());
});

/* ================================================================ */
/* 6. Zones de livraison, coupons, bannières                         */
/* ================================================================ */
router.get('/delivery-zones', (_req, res) => {
  res.json(db.prepare('SELECT * FROM delivery_zones ORDER BY sort_order, name').all());
});

router.post('/delivery-zones', (req, res) => {
  const info = db
    .prepare('INSERT INTO delivery_zones (name, region, fee, delay, is_active, sort_order) VALUES (?,?,?,?,?,?)')
    .run(
      clean(req.body.name, 60) || 'Zone',
      clean(req.body.region, 60) || 'Conakry',
      toInt(req.body.fee),
      clean(req.body.delay, 60),
      toBool(req.body.isActive ?? 1),
      toInt(req.body.sortOrder)
    );
  res.status(201).json(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/delivery-zones/:id', (req, res) => {
  const id = toInt(req.params.id);
  if (!db.prepare('SELECT id FROM delivery_zones WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Zone introuvable.' });
  db.prepare('UPDATE delivery_zones SET name=?, region=?, fee=?, delay=?, is_active=?, sort_order=? WHERE id=?')
    .run(
      clean(req.body.name, 60),
      clean(req.body.region, 60) || 'Conakry',
      toInt(req.body.fee),
      clean(req.body.delay, 60),
      toBool(req.body.isActive ?? 1),
      toInt(req.body.sortOrder),
      id
    );
  res.json(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(id));
});

router.delete('/delivery-zones/:id', (req, res) => {
  db.prepare('DELETE FROM delivery_zones WHERE id = ?').run(toInt(req.params.id));
  res.json({ ok: true });
});

router.get('/coupons', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

router.post('/coupons', (req, res) => {
  const code = (clean(req.body.code, 30) || '').toUpperCase();
  if (!code) return res.status(400).json({ error: 'Code obligatoire.' });
  if (db.prepare('SELECT id FROM coupons WHERE UPPER(code) = ?').get(code))
    return res.status(409).json({ error: 'Ce code existe déjà.' });
  const info = db
    .prepare('INSERT INTO coupons (code, type, value, min_total, max_uses, expires_at, is_active) VALUES (?,?,?,?,?,?,?)')
    .run(
      code,
      ['percent', 'fixed', 'free_shipping'].includes(req.body.type) ? req.body.type : 'percent',
      toInt(req.body.value),
      toInt(req.body.minTotal),
      req.body.maxUses ? toInt(req.body.maxUses) : null,
      clean(req.body.expiresAt, 30),
      toBool(req.body.isActive ?? 1)
    );
  res.status(201).json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/coupons/:id', (req, res) => {
  db.prepare('UPDATE coupons SET is_active = ? WHERE id = ?').run(toBool(req.body.isActive), toInt(req.params.id));
  res.json({ ok: true });
});

router.delete('/coupons/:id', (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(toInt(req.params.id));
  res.json({ ok: true });
});

router.get('/banners', (_req, res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY sort_order, id').all());
});

router.post('/banners', (req, res) => {
  const info = db
    .prepare('INSERT INTO banners (title, subtitle, cta_label, cta_link, image, theme, sort_order, is_active) VALUES (?,?,?,?,?,?,?,?)')
    .run(
      clean(req.body.title, 100) || 'Nouvelle bannière',
      clean(req.body.subtitle, 200),
      clean(req.body.ctaLabel, 40),
      clean(req.body.ctaLink, 200),
      clean(req.body.image, 300),
      clean(req.body.theme, 20) || 'gold',
      toInt(req.body.sortOrder),
      toBool(req.body.isActive ?? 1)
    );
  res.status(201).json(db.prepare('SELECT * FROM banners WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/banners/:id', (req, res) => {
  const id = toInt(req.params.id);
  db.prepare('UPDATE banners SET title=?, subtitle=?, cta_label=?, cta_link=?, image=?, theme=?, sort_order=?, is_active=? WHERE id=?')
    .run(
      clean(req.body.title, 100),
      clean(req.body.subtitle, 200),
      clean(req.body.ctaLabel, 40),
      clean(req.body.ctaLink, 200),
      clean(req.body.image, 300),
      clean(req.body.theme, 20) || 'gold',
      toInt(req.body.sortOrder),
      toBool(req.body.isActive ?? 1),
      id
    );
  res.json(db.prepare('SELECT * FROM banners WHERE id = ?').get(id));
});

router.delete('/banners/:id', (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(toInt(req.params.id));
  res.json({ ok: true });
});

/* ================================================================ */
/* 7. Paramètres de la boutique                                      */
/* ================================================================ */
router.get('/settings', (_req, res) => res.json(settings()));

router.put('/settings', (req, res) => {
  const allowed = Object.keys(DEFAULT_SETTINGS);
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) if (allowed.includes(k)) setSetting(k, clean(String(v), 400) ?? '');
  });
  tx(Object.entries(req.body || {}));
  res.json(settings());
});

/** Changement du mot de passe administrateur. */
router.post('/password', (req, res) => {
  const next = String(req.body.next || '');
  const current = String(req.body.current || '');
  if (next.length < 10)
    return res.status(400).json({ error: 'Mot de passe administrateur : 10 caractères minimum.' });
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current, row.password_hash))
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), req.user.id);
  res.json({ ok: true });
});

/* ================================================================ */
/* 8. Upload d'images produit                                        */
/* ================================================================ */
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype);
    cb(ok ? null : new Error('Format accepté : JPG, PNG, WEBP.'), ok);
  },
});

router.post('/upload', upload.array('images', 8), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Aucune image reçue.' });
    const urls = [];
    for (const file of req.files) {
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      // Re-encodage systématique : supprime tout code caché dans le fichier
      // et divise le poids par 5 (important sur la 3G guinéenne).
      await sharp(file.buffer)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, name));
      urls.push(`/uploads/${name}`);
    }
    res.status(201).json({ urls });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
