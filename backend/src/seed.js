'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { db } = require('./db');
const { slugify } = require('./lib/utils');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'demo');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Visuels de démonstration                                            */
/* Cartes sobres aux couleurs de la marque : le gérant remplace chaque  */
/* visuel par sa vraie photo depuis le panel admin.                     */
/* ------------------------------------------------------------------ */
const PALETTES = [
  ['#1c1c1c', '#3a3222'], ['#2b2113', '#c8a24a'], ['#101010', '#2c2c2c'],
  ['#3a2c12', '#8c6d2f'], ['#1a1a1a', '#4a3c1f'], ['#241a0c', '#a8863c'],
];

async function makeVisual(label, sub, index) {
  const file = path.join(UPLOAD_DIR, `${slugify(label)}-${index}.webp`);
  const [c1, c2] = PALETTES[index % PALETTES.length];
  const words = label.split(' ');
  const line1 = words.slice(0, 2).join(' ');
  const line2 = words.slice(2).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="900" height="900" fill="url(#g)"/>
    <circle cx="450" cy="380" r="200" fill="none" stroke="#c8a24a" stroke-width="3" opacity="0.55"/>
    <text x="450" y="360" font-family="Georgia, serif" font-size="58" fill="#f4e7c8"
          text-anchor="middle" letter-spacing="2">${escapeXml(line1)}</text>
    <text x="450" y="430" font-family="Georgia, serif" font-size="58" fill="#f4e7c8"
          text-anchor="middle" letter-spacing="2">${escapeXml(line2)}</text>
    <text x="450" y="520" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#c8a24a"
          text-anchor="middle" letter-spacing="6">${escapeXml(sub.toUpperCase())}</text>
    <text x="450" y="830" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#ffffff"
          text-anchor="middle" letter-spacing="8" opacity="0.85">ALMADI SHOP</text>
  </svg>`;

  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(file);
  return `/uploads/demo/${path.basename(file)}`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])
  );
}

/* ------------------------------------------------------------------ */
/* Catalogue de démonstration                                          */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { name: 'Mode femme', season: 'toute_saison', icon: 'dress', sort: 1,
    children: [
      { name: 'Tenues d’été', season: 'ete', sort: 1 },
      { name: 'Collection Ramadan', season: 'ramadan', sort: 2 },
      { name: 'Tenues de fêtes — Décembre', season: 'decembre', sort: 3 },
      { name: 'Voiles & foulards', season: 'toute_saison', sort: 4 },
    ] },
  { name: 'Sacs & maroquinerie', season: 'toute_saison', icon: 'bag', sort: 2,
    children: [
      { name: 'Sacs à main', season: 'toute_saison', sort: 1 },
      { name: 'Sacs à dos', season: 'rentree', sort: 2 },
    ] },
  { name: 'Rentrée scolaire', season: 'rentree', icon: 'school', sort: 3,
    children: [
      { name: 'Cartables enfants', season: 'rentree', sort: 1 },
      { name: 'Fournitures & papeterie', season: 'rentree', sort: 2 },
    ] },
  { name: 'Accessoires', season: 'toute_saison', icon: 'star', sort: 4, children: [] },
];

const PRODUCTS = [
  // --- Tenues d'été -------------------------------------------------
  { cat: 'Tenues d’été', name: 'Robe longue fluide Almadi — coton imprimé', price: 285000, compare: 350000,
    stock: 14, featured: 1, isNew: 1, sold: 46, brand: 'Almadi', season: 'ete',
    short: 'Robe longue légère en coton imprimé, coupe fluide, idéale pour la saison chaude.',
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Beige', 'Bleu nuit', 'Terracotta'],
    tags: ['robe', 'été', 'coton', 'longue'] },
  { cat: 'Tenues d’été', name: 'Ensemble deux pièces lin — pantalon large', price: 340000, compare: null,
    stock: 9, featured: 1, isNew: 1, sold: 31, brand: 'Almadi', season: 'ete',
    short: 'Ensemble haut court et pantalon large en lin respirant.',
    sizes: ['S', 'M', 'L'], colors: ['Blanc cassé', 'Vert olive'], tags: ['ensemble', 'lin', 'été'] },
  { cat: 'Tenues d’été', name: 'Robe midi wax moderne', price: 265000, compare: 310000,
    stock: 0, featured: 0, isNew: 0, sold: 58, brand: 'Almadi', season: 'ete',
    short: 'Robe midi en wax, coupe cintrée, finitions soignées.',
    sizes: ['M', 'L', 'XL'], colors: ['Multicolore'], tags: ['wax', 'robe', 'midi'] },
  { cat: 'Tenues d’été', name: 'Kaftan léger brodé main', price: 395000, compare: null,
    stock: 6, featured: 0, isNew: 1, sold: 12, brand: 'Almadi', season: 'ete',
    short: 'Kaftan fluide avec broderies au col réalisées à la main.',
    sizes: ['Unique'], colors: ['Sable', 'Rose poudré'], tags: ['kaftan', 'brodé'] },

  // --- Ramadan ------------------------------------------------------
  { cat: 'Collection Ramadan', name: 'Abaya Dubaï satin — manches évasées', price: 520000, compare: 620000,
    stock: 11, featured: 1, isNew: 0, sold: 73, brand: 'Almadi', season: 'ramadan',
    short: 'Abaya en satin de Dubaï, coupe droite élégante et manches évasées.',
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Noir', 'Bordeaux', 'Gris perle'],
    tags: ['abaya', 'ramadan', 'satin'] },
  { cat: 'Collection Ramadan', name: 'Jilbab deux pièces prière', price: 375000, compare: null,
    stock: 18, featured: 0, isNew: 0, sold: 54, brand: 'Almadi', season: 'ramadan',
    short: 'Jilbab confortable deux pièces, tissu non transparent.',
    sizes: ['M', 'L', 'XL'], colors: ['Bleu marine', 'Noir'], tags: ['jilbab', 'prière', 'ramadan'] },
  { cat: 'Collection Ramadan', name: 'Ensemble caftan brodé perles', price: 680000, compare: 790000,
    stock: 4, featured: 1, isNew: 1, sold: 22, brand: 'Almadi', season: 'ramadan',
    short: 'Caftan de cérémonie avec broderies perlées sur le buste.',
    sizes: ['M', 'L'], colors: ['Doré', 'Émeraude'], tags: ['caftan', 'cérémonie', 'perles'] },

  // --- Décembre / fêtes --------------------------------------------
  { cat: 'Tenues de fêtes — Décembre', name: 'Robe de soirée sequins', price: 750000, compare: 900000,
    stock: 5, featured: 1, isNew: 1, sold: 19, brand: 'Almadi', season: 'decembre',
    short: 'Robe de soirée à sequins, dos travaillé, effet lumière garanti.',
    sizes: ['S', 'M', 'L'], colors: ['Or', 'Argent', 'Noir'], tags: ['soirée', 'fête', 'sequins'] },
  { cat: 'Tenues de fêtes — Décembre', name: 'Tailleur pantalon cérémonie', price: 620000, compare: null,
    stock: 7, featured: 0, isNew: 1, sold: 15, brand: 'Almadi', season: 'decembre',
    short: 'Tailleur ceinturé, veste structurée et pantalon fluide.',
    sizes: ['S', 'M', 'L', 'XL'], colors: ['Blanc', 'Camel'], tags: ['tailleur', 'cérémonie'] },
  { cat: 'Tenues de fêtes — Décembre', name: 'Robe bustier velours fêtes', price: 540000, compare: 640000,
    stock: 3, featured: 0, isNew: 0, sold: 27, brand: 'Almadi', season: 'decembre',
    short: 'Robe bustier en velours, fendue sur le côté.',
    sizes: ['S', 'M'], colors: ['Bordeaux', 'Vert sapin'], tags: ['velours', 'bustier'] },

  // --- Voiles -------------------------------------------------------
  { cat: 'Voiles & foulards', name: 'Voile mousseline premium 2 m', price: 95000, compare: 120000,
    stock: 46, featured: 0, isNew: 0, sold: 132, brand: 'Almadi', season: 'toute_saison',
    short: 'Voile en mousseline fine de 2 mètres, tombé parfait.',
    sizes: ['2 m'], colors: ['Noir', 'Beige', 'Rose', 'Bleu ciel', 'Blanc'], tags: ['voile', 'hijab'] },
  { cat: 'Voiles & foulards', name: 'Lot de 3 bonnets sous-voile', price: 60000, compare: null,
    stock: 38, featured: 0, isNew: 0, sold: 88, brand: 'Almadi', season: 'toute_saison',
    short: 'Lot de 3 bonnets en coton extensible.', sizes: ['Unique'],
    colors: ['Assortis'], tags: ['bonnet', 'sous-voile', 'lot'] },

  // --- Sacs à main --------------------------------------------------
  { cat: 'Sacs à main', name: 'Sac à main cuir grainé — grand format', price: 480000, compare: 560000,
    stock: 12, featured: 1, isNew: 1, sold: 64, brand: 'Almadi', season: 'toute_saison',
    short: 'Sac cabas en cuir grainé, doublure intérieure et poche zippée.',
    sizes: ['Grand'], colors: ['Noir', 'Camel', 'Bordeaux'], tags: ['sac', 'cuir', 'cabas'] },
  { cat: 'Sacs à main', name: 'Sac bandoulière chaîne dorée', price: 295000, compare: null,
    stock: 20, featured: 1, isNew: 0, sold: 97, brand: 'Almadi', season: 'toute_saison',
    short: 'Petit sac bandoulière avec chaîne dorée amovible.',
    sizes: ['Petit'], colors: ['Noir', 'Rouge', 'Beige'], tags: ['sac', 'bandoulière'] },
  { cat: 'Sacs à main', name: 'Pochette de soirée satinée', price: 165000, compare: 195000,
    stock: 0, featured: 0, isNew: 0, sold: 41, brand: 'Almadi', season: 'decembre',
    short: 'Pochette satinée avec fermoir bijou.', sizes: ['Unique'],
    colors: ['Or', 'Argent'], tags: ['pochette', 'soirée'] },
  { cat: 'Sacs à main', name: 'Ensemble sac + portefeuille assorti', price: 560000, compare: 680000,
    stock: 8, featured: 0, isNew: 1, sold: 33, brand: 'Almadi', season: 'toute_saison',
    short: 'Duo sac à main et portefeuille assorti, même finition.',
    sizes: ['Moyen'], colors: ['Camel', 'Noir'], tags: ['sac', 'portefeuille', 'ensemble'] },

  // --- Cartables enfants -------------------------------------------
  { cat: 'Cartables enfants', name: 'Cartable scolaire garçon 38 cm — 3 compartiments', price: 185000, compare: 225000,
    stock: 32, featured: 1, isNew: 1, sold: 118, brand: 'Almadi', season: 'rentree',
    short: 'Cartable résistant à 3 compartiments, bretelles rembourrées.',
    sizes: ['38 cm'], colors: ['Bleu', 'Noir', 'Rouge'], tags: ['cartable', 'école', 'garçon'] },
  { cat: 'Cartables enfants', name: 'Cartable fille à roulettes 42 cm', price: 265000, compare: 320000,
    stock: 17, featured: 1, isNew: 1, sold: 96, brand: 'Almadi', season: 'rentree',
    short: 'Cartable à roulettes avec poignée télescopique, idéal primaire.',
    sizes: ['42 cm'], colors: ['Rose', 'Violet'], tags: ['cartable', 'roulettes', 'fille'] },
  { cat: 'Cartables enfants', name: 'Sac maternelle mini — 28 cm', price: 95000, compare: null,
    stock: 25, featured: 0, isNew: 0, sold: 62, brand: 'Almadi', season: 'rentree',
    short: 'Petit sac léger pour la maternelle.', sizes: ['28 cm'],
    colors: ['Jaune', 'Rose', 'Bleu'], tags: ['maternelle', 'sac'] },

  // --- Fournitures --------------------------------------------------
  { cat: 'Fournitures & papeterie', name: 'Pack rentrée complet CP–CE2', price: 145000, compare: 180000,
    stock: 40, featured: 1, isNew: 1, sold: 204, brand: 'Almadi', season: 'rentree',
    short: 'Cahiers, stylos, crayons, règle, gomme, ardoise — tout le nécessaire.',
    sizes: ['Pack'], colors: [], tags: ['pack', 'rentrée', 'fournitures'] },
  { cat: 'Fournitures & papeterie', name: 'Lot de 10 cahiers 96 pages', price: 55000, compare: 70000,
    stock: 120, featured: 0, isNew: 0, sold: 310, brand: 'Almadi', season: 'rentree',
    short: 'Lot de 10 cahiers grand format, papier 70 g.', sizes: ['Lot de 10'],
    colors: [], tags: ['cahier', 'lot'] },
  { cat: 'Fournitures & papeterie', name: 'Trousse garnie 24 pièces', price: 78000, compare: null,
    stock: 54, featured: 0, isNew: 1, sold: 144, brand: 'Almadi', season: 'rentree',
    short: 'Trousse complète : feutres, crayons de couleur, taille-crayon.',
    sizes: ['Unique'], colors: ['Bleu', 'Rose'], tags: ['trousse', 'coloriage'] },
  { cat: 'Fournitures & papeterie', name: 'Boîte de 12 crayons de couleur', price: 22000, compare: null,
    stock: 200, featured: 0, isNew: 0, sold: 265, brand: 'Almadi', season: 'rentree',
    short: 'Crayons de couleur bois, mine résistante.', sizes: ['Boîte de 12'],
    colors: [], tags: ['crayons', 'couleur'] },

  // --- Sacs à dos ---------------------------------------------------
  { cat: 'Sacs à dos', name: 'Sac à dos urbain avec port USB', price: 235000, compare: 290000,
    stock: 15, featured: 0, isNew: 1, sold: 49, brand: 'Almadi', season: 'toute_saison',
    short: 'Sac à dos imperméable, compartiment PC 15" et port USB.',
    sizes: ['Unique'], colors: ['Gris', 'Noir'], tags: ['sac à dos', 'usb', 'ordinateur'] },

  // --- Accessoires --------------------------------------------------
  { cat: 'Accessoires', name: 'Parure bijoux dorée 3 pièces', price: 130000, compare: 160000,
    stock: 28, featured: 0, isNew: 1, sold: 71, brand: 'Almadi', season: 'decembre',
    short: 'Collier, boucles d’oreilles et bracelet assortis, finition dorée.',
    sizes: ['Unique'], colors: ['Doré'], tags: ['bijoux', 'parure'] },
  { cat: 'Accessoires', name: 'Ceinture cuir tressée femme', price: 85000, compare: null,
    stock: 22, featured: 0, isNew: 0, sold: 38, brand: 'Almadi', season: 'toute_saison',
    short: 'Ceinture tressée en cuir véritable, boucle dorée.',
    sizes: ['85 cm', '95 cm'], colors: ['Marron', 'Noir'], tags: ['ceinture', 'cuir'] },
];

const ZONES = [
  { name: 'Kaloum', region: 'Conakry', fee: 20000, delay: 'Le jour même', sort: 1 },
  { name: 'Dixinn', region: 'Conakry', fee: 20000, delay: 'Le jour même', sort: 2 },
  { name: 'Matam', region: 'Conakry', fee: 20000, delay: 'Le jour même', sort: 3 },
  { name: 'Ratoma', region: 'Conakry', fee: 25000, delay: '24 h', sort: 4 },
  { name: 'Matoto', region: 'Conakry', fee: 25000, delay: '24 h', sort: 5 },
  { name: 'Coyah', region: 'Périphérie', fee: 40000, delay: '24 à 48 h', sort: 6 },
  { name: 'Dubréka', region: 'Périphérie', fee: 40000, delay: '24 à 48 h', sort: 7 },
  { name: 'Kindia', region: 'Intérieur', fee: 70000, delay: '2 à 3 jours', sort: 8 },
  { name: 'Boké', region: 'Intérieur', fee: 90000, delay: '3 à 4 jours', sort: 9 },
  { name: 'Labé', region: 'Intérieur', fee: 95000, delay: '3 à 4 jours', sort: 10 },
  { name: 'Kankan', region: 'Intérieur', fee: 110000, delay: '3 à 5 jours', sort: 11 },
  { name: 'N’Zérékoré', region: 'Intérieur', fee: 120000, delay: '4 à 5 jours', sort: 12 },
];

const BANNERS = [
  { title: 'Collection Rentrée 2026', subtitle: 'Cartables, packs de fournitures et sacs à dos — livrés à Conakry en 24 h.',
    cta: 'Voir la collection', link: '/categorie/rentree-scolaire', theme: 'gold' },
  { title: 'Sacs & maroquinerie', subtitle: 'Cuir grainé, bandoulières chaîne dorée, ensembles assortis.',
    cta: 'Découvrir les sacs', link: '/categorie/sacs-maroquinerie', theme: 'dark' },
  { title: 'Élégance toute l’année', subtitle: 'Été, Ramadan, fêtes de fin d’année : une collection par saison.',
    cta: 'Mode femme', link: '/categorie/mode-femme', theme: 'gold' },
];

const REVIEWS = [
  ['Mariama D.', 5, 'Tissu de très bonne qualité, exactement comme sur la photo. Livrée à Ratoma en une journée.'],
  ['Fatoumata B.', 5, 'J’ai commandé deux fois, toujours impeccable. Le service client répond vite sur WhatsApp.'],
  ['Aïssatou S.', 4, 'Très jolie coupe. J’aurais aimé une taille au-dessus, pensez à commander large.'],
  ['Kadiatou C.', 5, 'Le cartable est solide, mon fils l’utilise depuis la rentrée sans problème.'],
  ['Hadja M.', 5, 'Paiement Orange Money simple et rapide, colis reçu le lendemain.'],
];

/* ------------------------------------------------------------------ */
async function seed() {
  console.log('→ Initialisation des données Almadi Shop…');

  const wipe = db.transaction(() => {
    for (const t of ['order_events', 'order_items', 'orders', 'product_variants',
      'product_images', 'products', 'categories', 'delivery_zones', 'banners',
      'coupons', 'reviews', 'newsletter']) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
    db.prepare("DELETE FROM users WHERE role = 'customer'").run();
  });
  wipe();

  /* --- Administrateur ---------------------------------------------- */
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@almadishop.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'Almadi@2026!';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?')
      .run(bcrypt.hashSync(adminPass, 12), 'admin', existing.id);
  } else {
    db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)')
      .run('Administrateur Almadi', adminEmail, '+224625003339', bcrypt.hashSync(adminPass, 12), 'admin');
  }

  /* --- Client de démonstration ------------------------------------- */
  db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)')
    .run('Mariama Diallo', 'client@almadishop.com', '+224620112233', bcrypt.hashSync('Client@2026', 12), 'customer');

  /* --- Catégories --------------------------------------------------- */
  const catIds = {};
  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, description, icon, parent_id, season, sort_order, is_active) VALUES (?,?,?,?,?,?,?,1)'
  );
  for (const c of CATEGORIES) {
    const info = insertCat.run(c.name, slugify(c.name), null, c.icon, null, c.season, c.sort);
    catIds[c.name] = info.lastInsertRowid;
    for (const sub of c.children) {
      const s = insertCat.run(sub.name, slugify(sub.name), null, null, info.lastInsertRowid, sub.season, sub.sort);
      catIds[sub.name] = s.lastInsertRowid;
    }
  }
  console.log(`  ✓ ${Object.keys(catIds).length} catégories`);

  /* --- Produits ------------------------------------------------------ */
  const insertProduct = db.prepare(
    `INSERT INTO products (name, slug, sku, short_desc, description, price, compare_price, cost_price,
      stock, low_stock, track_stock, category_id, season, brand, tags, status, is_featured, is_new, sold_count, views)
     VALUES (@name,@slug,@sku,@short_desc,@description,@price,@compare_price,@cost_price,
      @stock,@low_stock,1,@category_id,@season,@brand,@tags,'active',@is_featured,@is_new,@sold,@views)`
  );
  const insertImage = db.prepare('INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)');
  const insertVariant = db.prepare(
    'INSERT INTO product_variants (product_id, kind, value, stock, price_delta) VALUES (?,?,?,?,0)'
  );

  let i = 0;
  const productIds = [];
  for (const p of PRODUCTS) {
    const visual = await makeVisual(p.name.split('—')[0].trim(), p.cat, i);
    const description = `${p.short}\n\n` +
      `Article proposé par Almadi Shop, Conakry. Qualité vérifiée avant expédition.\n` +
      `• Catégorie : ${p.cat}\n` +
      `• Livraison à Conakry sous 24 h, intérieur du pays sous 2 à 5 jours\n` +
      `• Paiement Wave, Orange Money, carte bancaire ou à la livraison\n` +
      `• Échange possible sous 48 h si l’article n’a pas été porté\n\n` +
      `Pour toute question, contactez-nous au +224 625 00 33 39.`;

    const info = insertProduct.run({
      name: p.name,
      slug: slugify(p.name),
      sku: 'ALM-' + String(1000 + i),
      short_desc: p.short,
      description,
      price: p.price,
      compare_price: p.compare,
      cost_price: Math.round(p.price * 0.62),
      stock: p.stock,
      low_stock: 3,
      category_id: catIds[p.cat],
      season: p.season,
      brand: p.brand,
      tags: p.tags.join(','),
      is_featured: p.featured,
      is_new: p.isNew,
      sold: p.sold,
      views: p.sold * 7 + 30,
    });
    const pid = info.lastInsertRowid;
    productIds.push(pid);

    insertImage.run(pid, visual, 0);
    const second = await makeVisual(p.name.split('—')[0].trim(), 'vue 2', i + 3);
    insertImage.run(pid, second, 1);

    for (const s of p.sizes) insertVariant.run(pid, 'taille', s, Math.ceil(p.stock / Math.max(p.sizes.length, 1)));
    for (const c of p.colors) insertVariant.run(pid, 'couleur', c, Math.ceil(p.stock / Math.max(p.colors.length, 1)));
    i++;
  }
  console.log(`  ✓ ${PRODUCTS.length} produits + visuels`);

  /* --- Zones, bannières, coupons ------------------------------------ */
  const insertZone = db.prepare(
    'INSERT INTO delivery_zones (name, region, fee, delay, is_active, sort_order) VALUES (?,?,?,?,1,?)'
  );
  for (const z of ZONES) insertZone.run(z.name, z.region, z.fee, z.delay, z.sort);

  const insertBanner = db.prepare(
    'INSERT INTO banners (title, subtitle, cta_label, cta_link, theme, sort_order, is_active) VALUES (?,?,?,?,?,?,1)'
  );
  BANNERS.forEach((b, n) => insertBanner.run(b.title, b.subtitle, b.cta, b.link, b.theme, n));

  db.prepare('INSERT INTO coupons (code, type, value, min_total, max_uses, is_active) VALUES (?,?,?,?,?,1)')
    .run('BIENVENUE10', 'percent', 10, 200000, 500);
  db.prepare('INSERT INTO coupons (code, type, value, min_total, max_uses, is_active) VALUES (?,?,?,?,?,1)')
    .run('LIVRAISON0', 'free_shipping', 0, 500000, 200);

  /* --- Avis ---------------------------------------------------------- */
  const insertReview = db.prepare(
    'INSERT INTO reviews (product_id, author, rating, comment, is_approved) VALUES (?,?,?,?,1)'
  );
  productIds.slice(0, 12).forEach((pid, n) => {
    const [author, rating, comment] = REVIEWS[n % REVIEWS.length];
    insertReview.run(pid, author, rating, comment);
    db.prepare('UPDATE products SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?')
      .run(rating, pid);
  });

  /* --- Commandes de démonstration ------------------------------------ */
  const DEMO_ORDERS = [
    { name: 'Aminata Camara', phone: '+224621445566', zone: 4, method: 'orange_money', status: 'delivered', pay: 'paid', days: 9 },
    { name: 'Kadiatou Barry', phone: '+224622778899', zone: 1, method: 'wave', status: 'shipped', pay: 'paid', days: 3 },
    { name: 'Hadja Sow', phone: '+224628334455', zone: 5, method: 'cash', status: 'confirmed', pay: 'pending', days: 1 },
    { name: 'Fatoumata Bah', phone: '+224623998877', zone: 2, method: 'card', status: 'pending', pay: 'pending', days: 0 },
    { name: 'Salématou Keita', phone: '+224629112233', zone: 8, method: 'wave', status: 'delivered', pay: 'paid', days: 16 },
    { name: 'Nènè Diallo', phone: '+224627556644', zone: 3, method: 'orange_money', status: 'cancelled', pay: 'refunded', days: 6 },
  ];

  const zones = db.prepare('SELECT * FROM delivery_zones ORDER BY id').all();
  const insertOrder = db.prepare(
    `INSERT INTO orders (order_number, customer_name, phone, address, zone_id, zone_name, subtotal,
      delivery_fee, discount, total, payment_method, payment_status, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', ?),datetime('now', ?))`
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, name, image, unit_price, quantity, variant, line_total) VALUES (?,?,?,?,?,?,?,?)'
  );
  const insertEvent = db.prepare(
    "INSERT INTO order_events (order_id, status, message, author, created_at) VALUES (?,?,?,?,datetime('now', ?))"
  );

  DEMO_ORDERS.forEach((o, n) => {
    const zone = zones[o.zone] || zones[0];
    const picks = [productIds[(n * 3) % productIds.length], productIds[(n * 5 + 2) % productIds.length]];
    let subtotal = 0;
    const lines = picks.map((pid, k) => {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(pid);
      const qty = k === 0 ? 1 : 2;
      subtotal += p.price * qty;
      const img = db.prepare('SELECT url FROM product_images WHERE product_id = ? LIMIT 1').get(pid);
      return { pid, name: p.name, image: img ? img.url : null, price: p.price, qty };
    });
    const total = subtotal + zone.fee;
    const offset = `-${o.days} days`;
    const info = insertOrder.run(
      `ALM-DEMO-${String(n + 1).padStart(3, '0')}`, o.name, o.phone,
      `Quartier ${zone.name}, Conakry`, zone.id, `${zone.name} (${zone.region})`,
      subtotal, zone.fee, 0, total, o.method, o.pay, o.status, offset, offset
    );
    for (const l of lines)
      insertItem.run(info.lastInsertRowid, l.pid, l.name, l.image, l.price, l.qty, null, l.price * l.qty);
    insertEvent.run(info.lastInsertRowid, 'pending', 'Commande reçue, en attente de confirmation.', 'système', offset);
    if (o.status !== 'pending')
      insertEvent.run(info.lastInsertRowid, o.status, 'Mise à jour du statut.', 'Administrateur Almadi', offset);
  });

  console.log(`  ✓ ${ZONES.length} zones de livraison, ${BANNERS.length} bannières, ${DEMO_ORDERS.length} commandes de démo`);
  console.log('\n  Accès administrateur');
  console.log(`   ${adminEmail}`);
  console.log(`   ${adminPass}`);
  console.log('   (à modifier dès la mise en ligne)\n');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
