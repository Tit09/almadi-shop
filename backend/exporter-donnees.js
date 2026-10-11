/**
 * Almadi Shop — export du catalogue vers un fichier texte.
 *
 * POURQUOI : sur un hébergement gratuit, le disque est remis à zéro à chaque
 * redéploiement. La base SQLite disparaît, et avec elle les produits. Ce
 * script fige le catalogue dans un JSON que l'on committe dans Git : au
 * démarrage, si la base est vide, le serveur la reconstruit toute seule.
 *
 * Ce fichier sert AUSSI de sauvegarde lisible de votre catalogue.
 * Ce qui n'est PAS exporté : les commandes et les comptes clients — données
 * vivantes, qui n'ont rien à faire dans Git.
 *
 * UTILISATION, depuis le dossier backend :
 *     node exporter-donnees.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { db, settings } = require('./src/db');

const SORTIE = path.join(__dirname, 'data-export.json');

const donnees = {
    version: 1,
    exporteLe: new Date().toISOString(),

    categories: db.prepare('SELECT * FROM categories ORDER BY id').all(),
    products: db.prepare('SELECT * FROM products ORDER BY id').all(),
    product_images: db.prepare('SELECT * FROM product_images ORDER BY id').all(),
    product_variants: db.prepare('SELECT * FROM product_variants ORDER BY id').all(),
    delivery_zones: db.prepare('SELECT * FROM delivery_zones ORDER BY id').all(),
    banners: db.prepare('SELECT * FROM banners ORDER BY id').all(),
    coupons: db.prepare('SELECT * FROM coupons ORDER BY id').all(),
    reviews: db.prepare('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY id').all(),

    // Les réglages de la boutique, sauf ceux qui pourraient contenir un secret.
    settings: Object.fromEntries(
        Object.entries(settings()).filter(
            ([k]) => !['callmebot_apikey', 'meta_token', 'meta_phone_id'].includes(k)
        )
    ),
};

fs.writeFileSync(SORTIE, JSON.stringify(donnees, null, 2));

const poids = Math.round(fs.statSync(SORTIE).size / 1024);
console.log('\n  Catalogue exporté vers data-export.json');
console.log('  ' + '-'.repeat(44));
console.log(`  Catégories      : ${donnees.categories.length}`);
console.log(`  Produits        : ${donnees.products.length}`);
console.log(`  Photos liées    : ${donnees.product_images.length}`);
console.log(`  Tailles/couleurs: ${donnees.product_variants.length}`);
console.log(`  Zones livraison : ${donnees.delivery_zones.length}`);
console.log(`  Bannières       : ${donnees.banners.length}`);
console.log(`  Avis publiés    : ${donnees.reviews.length}`);
console.log(`  Poids du fichier: ${poids} Ko\n`);