'use strict';

const { db } = require('../db');

const BASE_FIELDS = `
  p.id, p.name, p.slug, p.sku, p.short_desc, p.description,
  p.price, p.compare_price, p.stock, p.low_stock, p.track_stock,
  p.category_id, p.season, p.brand, p.tags, p.status,
  p.is_featured, p.is_new, p.views, p.sold_count,
  p.rating_sum, p.rating_count, p.created_at, p.updated_at,
  c.name AS category_name, c.slug AS category_slug
`;

const imagesStmt = db.prepare(
  'SELECT url FROM product_images WHERE product_id = ? ORDER BY position, id'
);
const variantsStmt = db.prepare(
  'SELECT id, kind, value, stock, price_delta FROM product_variants WHERE product_id = ? ORDER BY kind, id'
);

/** Transforme une ligne SQL en objet produit prêt pour le front. */
function hydrate(row, { withVariants = true } = {}) {
  if (!row) return null;
  const images = imagesStmt.all(row.id).map((i) => i.url);
  const variants = withVariants ? variantsStmt.all(row.id) : [];
  const inStock = row.track_stock ? row.stock > 0 : true;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDesc: row.short_desc,
    description: row.description,
    price: row.price,
    comparePrice: row.compare_price || null,
    discount:
      row.compare_price && row.compare_price > row.price
        ? Math.round(((row.compare_price - row.price) / row.compare_price) * 100)
        : 0,
    stock: row.stock,
    lowStock: row.low_stock,
    trackStock: !!row.track_stock,
    inStock,
    stockState: !inStock ? 'out' : row.track_stock && row.stock <= row.low_stock ? 'low' : 'ok',
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
      : null,
    season: row.season,
    brand: row.brand,
    tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    status: row.status,
    isFeatured: !!row.is_featured,
    isNew: !!row.is_new,
    views: row.views,
    soldCount: row.sold_count,
    rating: row.rating_count ? +(row.rating_sum / row.rating_count).toFixed(1) : 0,
    ratingCount: row.rating_count,
    images,
    image: images[0] || null,
    variants: variants.reduce((acc, v) => {
      (acc[v.kind] = acc[v.kind] || []).push({
        id: v.id,
        value: v.value,
        stock: v.stock,
        priceDelta: v.price_delta,
      });
      return acc;
    }, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SORTS = {
  recent: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  popular: 'p.sold_count DESC, p.views DESC',
  rating: '(CASE WHEN p.rating_count = 0 THEN 0 ELSE p.rating_sum * 1.0 / p.rating_count END) DESC',
  name: 'p.name COLLATE NOCASE ASC',
  stock_asc: 'p.stock ASC',
};

/**
 * Recherche paginée. Tous les filtres passent par des paramètres liés,
 * jamais par concaténation de chaînes : pas d'injection SQL possible.
 */
function search(opts = {}) {
  const {
    q, category, season, minPrice, maxPrice, featured, isNew,
    inStock, status = 'active', sort = 'recent', page = 1, limit = 12,
    lowStockOnly = false,
  } = opts;

  const where = [];
  const params = {};

  if (status && status !== 'all') { where.push('p.status = @status'); params.status = status; }
  if (q) {
    where.push('(p.name LIKE @q OR p.short_desc LIKE @q OR p.tags LIKE @q OR p.sku LIKE @q OR c.name LIKE @q)');
    params.q = `%${q}%`;
  }
  if (category) { where.push('c.slug = @category'); params.category = category; }
  if (season) { where.push('p.season = @season'); params.season = season; }
  if (minPrice != null) { where.push('p.price >= @minPrice'); params.minPrice = minPrice; }
  if (maxPrice != null) { where.push('p.price <= @maxPrice'); params.maxPrice = maxPrice; }
  if (featured) where.push('p.is_featured = 1');
  if (isNew) where.push('p.is_new = 1');
  if (inStock) where.push('(p.track_stock = 0 OR p.stock > 0)');
  if (lowStockOnly) where.push('(p.track_stock = 1 AND p.stock <= p.low_stock)');

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const order = SORTS[sort] || SORTS.recent;
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 60);
  const current = Math.max(parseInt(page, 10) || 1, 1);

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM products p LEFT JOIN categories c ON c.id = p.category_id ${clause}`)
    .get(params).n;

  const rows = db
    .prepare(
      `SELECT ${BASE_FIELDS} FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${clause} ORDER BY ${order} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: perPage, offset: (current - 1) * perPage });

  return {
    items: rows.map((r) => hydrate(r, { withVariants: false })),
    total,
    page: current,
    pages: Math.max(Math.ceil(total / perPage), 1),
    limit: perPage,
  };
}

function findBySlug(slug, status = 'active') {
  const row = db
    .prepare(
      `SELECT ${BASE_FIELDS} FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? ${status === 'all' ? '' : 'AND p.status = ' + "'active'"}`
    )
    .get(slug);
  return hydrate(row);
}

function findById(id) {
  const row = db
    .prepare(
      `SELECT ${BASE_FIELDS} FROM products p
       LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
    )
    .get(id);
  return hydrate(row);
}

module.exports = { hydrate, search, findBySlug, findById, BASE_FIELDS, SORTS };
