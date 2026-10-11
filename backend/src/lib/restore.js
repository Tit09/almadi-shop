'use strict';

const fs = require('fs');
const path = require('path');
const { db, setSetting } = require('../db');

/**
 * Reconstruction automatique du catalogue au démarrage.
 *
 * Sur un hébergement gratuit, le disque est effacé à chaque redéploiement :
 * la base SQLite repart vide et la boutique affiche zéro produit. Ce module
 * la remplit à partir de « data-export.json », fichier produit par
 * exporter-donnees.js et versionné dans Git.
 *
 * SÉCURITÉ DE L'OPÉRATION : l'import ne se déclenche QUE si la table des
 * produits est vide. Sur un vrai serveur avec disque persistant, il ne fera
 * jamais rien — aucun risque d'écraser un catalogue enrichi depuis le panel.
 */

const FICHIER = path.join(__dirname, '..', '..', 'data-export.json');

/** Insère une liste de lignes dans une table, en ignorant les doublons. */
function inserer(table, lignes) {
    if (!Array.isArray(lignes) || lignes.length === 0) return 0;

    const colonnes = Object.keys(lignes[0]);
    const stmt = db.prepare(
        `INSERT OR IGNORE INTO ${table} (${colonnes.join(', ')})
     VALUES (${colonnes.map((c) => '@' + c).join(', ')})`
    );

    let n = 0;
    for (const ligne of lignes) {
        try {
            n += stmt.run(ligne).changes;
        } catch (e) {
            // Une ligne fautive ne doit pas faire échouer tout l'import.
            console.warn(`[restauration] ${table} : ligne ignorée (${e.message})`);
        }
    }
    return n;
}

function restaurerSiVide() {
    const nbProduits = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
    if (nbProduits > 0) return { ignore: 'catalogue déjà présent' };

    if (!fs.existsSync(FICHIER)) {
        console.log('[restauration] aucun data-export.json — base laissée vide.');
        return { ignore: 'aucun fichier' };
    }

    let donnees;
    try {
        donnees = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
    } catch (e) {
        console.warn('[restauration] fichier illisible :', e.message);
        return { erreur: e.message };
    }

    // L'ordre compte : les catégories avant les produits, les produits avant
    // leurs photos, sinon les clés étrangères sont refusées.
    const tx = db.transaction(() => {
        const r = {};
        r.categories = inserer('categories', donnees.categories);
        r.products = inserer('products', donnees.products);
        r.images = inserer('product_images', donnees.product_images);
        r.variants = inserer('product_variants', donnees.product_variants);
        r.zones = inserer('delivery_zones', donnees.delivery_zones);
        r.banners = inserer('banners', donnees.banners);
        r.coupons = inserer('coupons', donnees.coupons);
        r.reviews = inserer('reviews', donnees.reviews);

        if (donnees.settings) {
            for (const [k, v] of Object.entries(donnees.settings)) setSetting(k, v);
        }
        return r;
    });

    const r = tx();
    console.log(
        `[restauration] catalogue rétabli : ${r.products} produits, ` +
        `${r.categories} catégories, ${r.zones} zones ` +
        `(export du ${donnees.exporteLe ? donnees.exporteLe.slice(0, 10) : '?'})`
    );
    return r;
}

/**
 * Garantit qu'un compte administrateur existe.
 *
 * Sans cela, après un redéploiement, la base repart vide : la boutique
 * s'affiche mais personne ne peut entrer dans le panel. Le mot de passe vient
 * des variables d'environnement, jamais du code.
 */
function assurerAdmin() {
    const dejaLa = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (dejaLa) return { ignore: 'administrateur déjà présent' };

    const email = (process.env.ADMIN_EMAIL || '').trim();
    const motDePasse = process.env.ADMIN_PASSWORD || '';

    if (!email || motDePasse.length < 8) {
        console.warn(
            '[admin] aucun compte administrateur et ADMIN_EMAIL / ADMIN_PASSWORD ' +
            'absents ou trop courts : le panel restera inaccessible.'
        );
        return { erreur: 'identifiants administrateur non fournis' };
    }

    const bcrypt = require('bcryptjs');
    db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)')
        .run('Administrateur Almadi', email.toLowerCase(), '', bcrypt.hashSync(motDePasse, 12), 'admin');

    console.log(`[admin] compte administrateur créé : ${email}`);
    return { cree: email };
}

module.exports = { restaurerSiVide, assurerAdmin };