'use strict';

const router = require('express').Router();
const { db, settings } = require('../db');
const P = require('../lib/products');
const { clean, toInt } = require('../lib/utils');

/* ---------------------------------------------------------------- */
/* Paramètres publics de la boutique                                  */
/* ---------------------------------------------------------------- */
router.get('/settings', (_req, res) => {
  const s = settings();
  res.json({
    shopName: s.shop_name,
    tagline: s.shop_tagline,
    currency: s.currency,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    facebook: s.facebook,
    instagram: s.instagram,
    tiktok: s.tiktok,
    announcement: s.announcement,
    freeShippingFrom: toInt(s.free_shipping_from, 0),
    activeSeason: s.active_season,
    payments: {
      wave: s.pay_wave === '1',
      orange_money: s.pay_orange_money === '1',
      card: s.pay_card === '1',
      cash: s.pay_cash === '1',
    },
  });
});

/* ---------------------------------------------------------------- */
/* Catégories                                                         */
/* ---------------------------------------------------------------- */
router.get('/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, (
         SELECT COUNT(*) FROM products p
         WHERE p.category_id = c.id AND p.status = 'active'
       ) AS product_count
       FROM categories c WHERE c.is_active = 1
       ORDER BY c.sort_order, c.name`
    )
    .all();

  const byId = new Map(rows.map((r) => [r.id, { ...map(r), children: [] }]));
  const tree = [];
  for (const row of rows) {
    const node = byId.get(row.id);
    if (row.parent_id && byId.has(row.parent_id)) byId.get(row.parent_id).children.push(node);
    else tree.push(node);
  }
  res.json(tree);
});

function map(r) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    image: r.image,
    icon: r.icon,
    season: r.season,
    parentId: r.parent_id,
    productCount: r.product_count ?? 0,
  };
}

/* ---------------------------------------------------------------- */
/* Zones de livraison                                                 */
/* ---------------------------------------------------------------- */
router.get('/delivery-zones', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, region, fee, delay FROM delivery_zones WHERE is_active = 1 ORDER BY sort_order, name')
    .all();
  res.json(rows);
});

/* ---------------------------------------------------------------- */
/* Bannières de la page d'accueil                                     */
/* ---------------------------------------------------------------- */
router.get('/banners', (_req, res) => {
  res.json(
    db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order, id').all()
  );
});

/* ---------------------------------------------------------------- */
/* Produits                                                           */
/* ---------------------------------------------------------------- */
router.get('/products', (req, res) => {
  const { q, category, season, sort, page, limit } = req.query;
  res.json(
    P.search({
      q: clean(q, 60),
      category: clean(category, 80),
      season: clean(season, 30),
      minPrice: req.query.min ? toInt(req.query.min) : null,
      maxPrice: req.query.max ? toInt(req.query.max) : null,
      featured: req.query.featured === '1',
      isNew: req.query.new === '1',
      inStock: req.query.in_stock === '1',
      sort,
      page,
      limit,
      status: 'active',
    })
  );
});

router.get('/products/:slug', (req, res) => {
  const product = P.findBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });

  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(product.id);

  const reviews = db
    .prepare(
      'SELECT id, author, rating, comment, created_at FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY id DESC LIMIT 20'
    )
    .all(product.id);

  const related = product.category
    ? db
        .prepare(
          `SELECT ${P.BASE_FIELDS} FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE p.category_id = ? AND p.id <> ? AND p.status = 'active'
           ORDER BY p.sold_count DESC LIMIT 8`
        )
        .all(product.category.id, product.id)
        .map((r) => P.hydrate(r, { withVariants: false }))
    : [];

  res.json({ ...product, reviews, related });
});

/* ---------------------------------------------------------------- */
/* Page d'accueil : tout en une requête (rapide sur réseau mobile)    */
/* ---------------------------------------------------------------- */
router.get('/home', (_req, res) => {
  const s = settings();
  const pick = (opts) => P.search({ ...opts, status: 'active', limit: opts.limit || 8 }).items;

  res.json({
    banners: db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order, id').all(),
    featured: pick({ featured: true, sort: 'popular', limit: 8 }),
    bestSellers: pick({ sort: 'popular', limit: 10 }),
    newArrivals: pick({ sort: 'recent', limit: 10 }),
    seasonal: {
      season: s.active_season,
      items: pick({ season: s.active_season, sort: 'popular', limit: 10 }),
    },
    categories: db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status='active') AS product_count
         FROM categories c WHERE c.is_active = 1 AND c.parent_id IS NULL
         ORDER BY c.sort_order, c.name LIMIT 12`
      )
      .all()
      .map(map),
  });
});

/* ---------------------------------------------------------------- */
/* Suggestions de recherche (autocomplete)                            */
/* ---------------------------------------------------------------- */
router.get('/suggest', (req, res) => {
  const q = clean(req.query.q, 40);
  if (!q || q.length < 2) return res.json([]);
  const rows = db
    .prepare(
      `SELECT p.name, p.slug, p.price, (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image
       FROM products p WHERE p.status='active' AND (p.name LIKE ? OR p.tags LIKE ?)
       ORDER BY p.sold_count DESC LIMIT 6`
    )
    .all(`%${q}%`, `%${q}%`);
  res.json(rows);
});

/* ---------------------------------------------------------------- */
/* Avis client                                                        */
/* ---------------------------------------------------------------- */
router.post('/reviews', (req, res) => {
  const productId = toInt(req.body.productId);
  const rating = Math.min(Math.max(toInt(req.body.rating, 5), 1), 5);
  const author = clean(req.body.author, 60);
  const comment = clean(req.body.comment, 800);

  if (!productId || !author) return res.status(400).json({ error: 'Nom et produit obligatoires.' });
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!exists) return res.status(404).json({ error: 'Produit introuvable.' });

  db.prepare('INSERT INTO reviews (product_id, author, rating, comment) VALUES (?,?,?,?)')
    .run(productId, author, rating, comment);

  res.status(201).json({ ok: true, message: 'Merci ! Votre avis sera publié après vérification.' });
});

/* ---------------------------------------------------------------- */
/* Newsletter                                                         */
/* ---------------------------------------------------------------- */
router.post('/newsletter', (req, res) => {
  const email = clean(req.body.email, 120);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(email.toLowerCase());
  res.json({ ok: true, message: 'Inscription enregistrée.' });
});

/* ---------------------------------------------------------------- */
/* Code promo                                                         */
/* ---------------------------------------------------------------- */
router.post('/coupons/validate', (req, res) => {
  const code = clean(req.body.code, 30);
  const subtotal = toInt(req.body.subtotal);
  if (!code) return res.status(400).json({ error: 'Code requis.' });

  const c = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(code);
  if (!c) return res.status(404).json({ error: 'Code promo invalide.' });
  if (c.expires_at && new Date(c.expires_at) < new Date())
    return res.status(410).json({ error: 'Ce code promo a expiré.' });
  if (c.max_uses != null && c.used_count >= c.max_uses)
    return res.status(410).json({ error: 'Ce code promo n’est plus disponible.' });
  if (subtotal < c.min_total)
    return res.status(400).json({
      error: `Ce code est valable à partir de ${c.min_total.toLocaleString('fr-FR')} GNF d’achat.`,
    });

  let discount = 0;
  if (c.type === 'percent') discount = Math.round((subtotal * c.value) / 100);
  else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);

  res.json({
    code: c.code,
    type: c.type,
    value: c.value,
    discount,
    freeShipping: c.type === 'free_shipping',
  });
});

module.exports = router;
