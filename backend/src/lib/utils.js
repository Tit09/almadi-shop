'use strict';

/** Slug URL propre, compatible accents français. */
function slugify(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Slug garanti unique dans une table donnée. */
function uniqueSlug(db, table, base, ignoreId = null) {
  let slug = slugify(base) || 'item';
  let candidate = slug;
  let i = 2;
  const stmt = ignoreId
    ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id <> ?`)
    : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);
  while (ignoreId ? stmt.get(candidate, ignoreId) : stmt.get(candidate)) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

/** Numéro de commande lisible : ALM-250922-4F7K */
function orderNumber() {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rnd = '';
  for (let i = 0; i < 4; i++) rnd += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ALM-${ymd}-${rnd}`;
}

/** Normalise un numéro guinéen/sénégalais saisi par le client. */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.length === 9) return '+224' + digits; // Guinée : 9 chiffres
  return digits;
}

/** Empêche l'injection HTML dans les champs libres. */
function clean(str, max = 500) {
  if (str == null) return null;
  return String(str).replace(/[<>]/g, '').trim().slice(0, max) || null;
}

function toInt(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
}

module.exports = { slugify, uniqueSlug, orderNumber, normalizePhone, clean, toInt, toBool };
