'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { db, settings } = require('../db');
const { orderNumber, normalizePhone, clean, toInt } = require('../lib/utils');
const { requireAuth } = require('../lib/auth');

/* Anti-spam : 10 commandes max par IP et par heure. */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de commandes envoyées depuis cet appareil. Réessayez plus tard.' },
});

const PAYMENT_METHODS = ['wave', 'orange_money', 'card', 'cash'];

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Nom trop court').max(80),
    phone: z.string().min(8, 'Téléphone invalide').max(20),
    email: z.string().email().max(120).optional().or(z.literal('')),
    address: z.string().min(5, 'Adresse trop courte').max(300),
    landmark: z.string().max(200).optional().or(z.literal('')),
    note: z.string().max(500).optional().or(z.literal('')),
  }),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
        variant: z.string().max(80).optional().nullable(),
      })
    )
    .min(1, 'Votre panier est vide'),
  zoneId: z.number().int().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: z.string().max(30).optional().nullable(),
});

/* ---------------------------------------------------------------- */
/* Création de commande                                               */
/* ---------------------------------------------------------------- */
router.post('/', orderLimiter, (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Commande invalide.',
      details: parsed.data ? [] : parsed.error.issues.map((i) => i.message),
    });
  }
  const { customer, items, zoneId, paymentMethod, couponCode } = parsed.data;

  const s = settings();
  const enabled = {
    wave: s.pay_wave === '1',
    orange_money: s.pay_orange_money === '1',
    card: s.pay_card === '1',
    cash: s.pay_cash === '1',
  };
  if (!enabled[paymentMethod])
    return res.status(400).json({ error: 'Ce moyen de paiement n’est pas disponible actuellement.' });

  const zone = db.prepare('SELECT * FROM delivery_zones WHERE id = ? AND is_active = 1').get(zoneId);
  if (!zone) return res.status(400).json({ error: 'Zone de livraison invalide.' });

  // Toute la création est transactionnelle : soit tout passe, soit rien.
  try {
    const result = db.transaction(() => {
      let subtotal = 0;
      const lines = [];

      for (const item of items) {
        const p = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(item.productId, 'active');
        if (!p) throw httpError(400, `Un article de votre panier n’est plus disponible.`);
        if (p.track_stock && p.stock < item.quantity)
          throw httpError(409, `Stock insuffisant pour « ${p.name} » (reste ${p.stock}).`);

        // Le prix vient TOUJOURS de la base, jamais du navigateur.
        const unit = p.price;
        const lineTotal = unit * item.quantity;
        subtotal += lineTotal;

        const image = db
          .prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY position LIMIT 1')
          .get(p.id);

        lines.push({
          product_id: p.id,
          name: p.name,
          image: image ? image.url : null,
          unit_price: unit,
          quantity: item.quantity,
          variant: clean(item.variant, 80),
          line_total: lineTotal,
        });
      }

      // Livraison
      const freeFrom = toInt(s.free_shipping_from, 0);
      let deliveryFee = freeFrom > 0 && subtotal >= freeFrom ? 0 : zone.fee;

      // Remise
      let discount = 0;
      let appliedCode = null;
      if (couponCode) {
        const c = db
          .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1')
          .get(couponCode);
        const valid =
          c &&
          subtotal >= c.min_total &&
          (!c.expires_at || new Date(c.expires_at) >= new Date()) &&
          (c.max_uses == null || c.used_count < c.max_uses);
        if (valid) {
          if (c.type === 'percent') discount = Math.round((subtotal * c.value) / 100);
          else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
          else if (c.type === 'free_shipping') deliveryFee = 0;
          appliedCode = c.code;
          db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(c.id);
        }
      }

      const total = Math.max(subtotal - discount, 0) + deliveryFee;
      const number = orderNumber();

      const info = db
        .prepare(
          `INSERT INTO orders
           (order_number, user_id, customer_name, phone, email, address, zone_id, zone_name,
            landmark, note, subtotal, delivery_fee, discount, total, coupon_code,
            payment_method, payment_status, status)
           VALUES (@order_number, @user_id, @customer_name, @phone, @email, @address, @zone_id, @zone_name,
                   @landmark, @note, @subtotal, @delivery_fee, @discount, @total, @coupon_code,
                   @payment_method, @payment_status, 'pending')`
        )
        .run({
          order_number: number,
          user_id: req.user ? req.user.id : null,
          customer_name: clean(customer.name, 80),
          phone: normalizePhone(customer.phone),
          email: clean(customer.email, 120),
          address: clean(customer.address, 300),
          zone_id: zone.id,
          zone_name: `${zone.name} (${zone.region})`,
          landmark: clean(customer.landmark, 200),
          note: clean(customer.note, 500),
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          coupon_code: appliedCode,
          payment_method: paymentMethod,
          // Le paiement mobile/carte est confirmé par l'admin (ou par le webhook
          // de l'agrégateur une fois le contrat signé) — jamais par le client.
          payment_status: 'pending',
        });

      const orderId = info.lastInsertRowid;

      const insertItem = db.prepare(
        `INSERT INTO order_items (order_id, product_id, name, image, unit_price, quantity, variant, line_total)
         VALUES (?,?,?,?,?,?,?,?)`
      );
      for (const l of lines) {
        insertItem.run(orderId, l.product_id, l.name, l.image, l.unit_price, l.quantity, l.variant, l.line_total);
        db.prepare(
          'UPDATE products SET stock = MAX(stock - ?, 0), sold_count = sold_count + ? WHERE id = ? AND track_stock = 1'
        ).run(l.quantity, l.quantity, l.product_id);
      }

      db.prepare('INSERT INTO order_events (order_id, status, message, author) VALUES (?,?,?,?)').run(
        orderId,
        'pending',
        'Commande reçue, en attente de confirmation.',
        'système'
      );

      return { id: orderId, number, subtotal, deliveryFee, discount, total };
    })();

    const payInfo = {
      wave: { label: 'Wave', number: s.wave_number },
      orange_money: { label: 'Orange Money', number: s.orange_money_number },
      card: { label: 'Carte bancaire', number: null },
      cash: { label: 'Paiement à la livraison', number: null },
    }[paymentMethod];

    res.status(201).json({
      ok: true,
      orderNumber: result.number,
      total: result.total,
      subtotal: result.subtotal,
      deliveryFee: result.deliveryFee,
      discount: result.discount,
      paymentMethod,
      paymentInstructions: payInfo,
      whatsapp: s.whatsapp,
      message: 'Commande enregistrée. Notre équipe vous appelle pour confirmer.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/* ---------------------------------------------------------------- */
/* Suivi de commande (numéro + téléphone)                             */
/* ---------------------------------------------------------------- */
const trackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

router.get('/track', trackLimiter, (req, res) => {
  const number = clean(req.query.number, 40);
  const phone = normalizePhone(req.query.phone);
  if (!number || !phone)
    return res.status(400).json({ error: 'Numéro de commande et téléphone requis.' });

  const order = db
    .prepare('SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) AND phone = ?')
    .get(number, phone);
  if (!order) return res.status(404).json({ error: 'Aucune commande ne correspond à ces informations.' });

  res.json(serialize(order));
});

/* Commandes du compte client connecté */
router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.user.id);
  res.json(rows.map(serialize));
});

function serialize(order) {
  return {
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    customerName: order.customer_name,
    phone: order.phone,
    address: order.address,
    zoneName: order.zone_name,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    createdAt: order.created_at,
    items: db.prepare('SELECT name, image, unit_price, quantity, variant, line_total FROM order_items WHERE order_id = ?').all(order.id),
    events: db.prepare('SELECT status, message, created_at FROM order_events WHERE order_id = ? ORDER BY id').all(order.id),
  };
}

module.exports = router;
