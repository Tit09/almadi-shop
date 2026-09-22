# Almadi Shop — boutique en ligne complète

Application e-commerce pour **Almadi Shop** (Conakry, Guinée) : mode femme par
saison, sacs et maroquinerie, cartables et fournitures scolaires.

- **Boutique cliente** — React + Vite, installable en PWA sur mobile
- **API sécurisée** — Node.js / Express / SQLite, JWT, validation stricte
- **Panel d'administration** — commandes, stock, ruptures, produits phares, statistiques
- **Paiements** — Wave, Orange Money, carte bancaire, paiement à la livraison
- **Livraison** — zones et tarifs paramétrables (Conakry, périphérie, intérieur)

Contact boutique : **+224 625 00 33 39**

---

## 1. Démarrage en local (5 minutes)

Prérequis : **Node.js 18 ou plus** (`node -v` pour vérifier).

```bash
# --- API ---
cd backend
npm install
cp .env.example .env
# Ouvrir .env et remplacer JWT_SECRET par une valeur générée avec :
#   openssl rand -hex 32
npm run seed        # crée la base + 26 produits de démonstration
npm start           # API sur http://localhost:4000
```

Dans un **second terminal** :

```bash
# --- Boutique ---
cd frontend
npm install
npm run dev         # boutique sur http://localhost:5173
```

| Accès | Adresse | Identifiants |
|---|---|---|
| Boutique | http://localhost:5173 | — |
| Administration | http://localhost:5173/admin | `admin@almadishop.com` / `Almadi@2026!` |
| Compte client de test | — | `client@almadishop.com` / `Client@2026` |

> **À faire avant la mise en ligne :** changer le mot de passe administrateur
> depuis *Administration → Paramètres → Sécurité*.

---

## 2. Ce que le gérant peut faire depuis le panel

| Rubrique | Actions |
|---|---|
| **Tableau de bord** | Chiffre d'affaires, ventes du jour et du mois, graphique 14 jours, top ventes, alertes de stock, dernières commandes |
| **Commandes** | Filtrer par statut et par paiement, changer le statut (reçue → confirmée → préparée → en livraison → livrée), marquer le paiement encaissé, ajouter des notes internes, appeler ou écrire sur WhatsApp en un clic, imprimer le bon de livraison |
| **Produits** | Créer / modifier / supprimer, photos (jusqu'à 8), tailles et couleurs, prix barré, prix d'achat et marge, mettre en **rupture de stock** en un clic, marquer **coup de cœur** et **nouveau**, modifier le stock directement dans la liste |
| **Catégories** | Rayons et sous-rayons, rattachement à une saison (été, Ramadan, décembre, rentrée) |
| **Livraison** | Zones, tarifs et délais ; seuil de livraison offerte |
| **Codes promo** | Pourcentage, montant fixe ou livraison offerte, montant minimum, nombre d'utilisations |
| **Bannières** | Le carrousel de la page d'accueil |
| **Clients** | Comptes enregistrés et clientes ayant commandé sans compte, avec total dépensé |
| **Avis** | Validation avant publication (aucun avis ne s'affiche sans accord) |
| **Paramètres** | Coordonnées, réseaux sociaux, saison mise en avant, moyens de paiement activés, numéros marchands Wave / Orange Money, mot de passe admin |

**Annuler une commande remet automatiquement les articles en stock.**

---

## 3. Sécurité mise en place

| Risque | Protection |
|---|---|
| Vol de session | JWT signé (secret ≥ 32 caractères, refus de démarrer sinon), expiration 7 jours |
| Mots de passe | Hachage **bcrypt** coût 12 — irréversible, illisible même en base |
| Force brute sur la connexion | 8 tentatives / 15 min / IP, message identique que le compte existe ou non |
| Abus d'API | 240 requêtes / min / IP ; 10 commandes / h / IP |
| Injection SQL | 100 % des requêtes en *prepared statements* avec paramètres liés |
| XSS | Nettoyage des champs libres + politique CSP stricte en production |
| **Prix falsifié par le client** | Le montant est **toujours recalculé côté serveur** à partir de la base : modifier le prix dans le navigateur n'a aucun effet |
| Survente | Vérification du stock **dans la transaction** de création de commande |
| Fichier malveillant déguisé en image | Ré-encodage systématique en WebP via `sharp` (tout code embarqué est détruit) |
| Données bancaires | **Aucune donnée de carte n'est stockée** : le paiement carte passe par le prestataire bancaire |
| Faux paiement mobile | Le statut « payée » est posé manuellement par l'admin après vérification |

---

## 4. Mise en production

### 4.1 Compilation

```bash
cd frontend && npm run build     # génère frontend/dist
```

L'API sert automatiquement `frontend/dist` : **un seul processus Node suffit**,
pas besoin d'un serveur séparé pour le front.

### 4.2 Variables d'environnement (`backend/.env`)

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<valeur de: openssl rand -hex 32>
CORS_ORIGIN=https://almadishop.com,https://www.almadishop.com
ADMIN_EMAIL=contact@almadishop.com
ADMIN_PASSWORD=<mot de passe long, changé ensuite depuis le panel>
```

### 4.3 Service permanent (systemd)

Fichier `/etc/systemd/system/almadi.service` :

```ini
[Unit]
Description=Almadi Shop API
After=network.target

[Service]
Type=simple
User=almadi
WorkingDirectory=/var/www/almadi/backend
EnvironmentFile=/var/www/almadi/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/www/almadi/backend/data /var/www/almadi/backend/uploads

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now almadi
sudo systemctl status almadi
```

### 4.4 Nginx + HTTPS

```nginx
server {
    server_name almadishop.com www.almadishop.com;

    client_max_body_size 8M;
    gzip on;
    gzip_types text/css application/javascript image/svg+xml application/json;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo certbot --nginx -d almadishop.com -d www.almadishop.com   # HTTPS gratuit
```

> Le HTTPS n'est pas optionnel : sans lui, l'installation de la PWA
> sur mobile ne fonctionne pas.

### 4.5 Sauvegarde quotidienne

La boutique entière tient dans deux dossiers : `backend/data` (base) et
`backend/uploads` (photos).

```bash
# /etc/cron.daily/almadi-backup
#!/bin/sh
DATE=$(date +%F)
mkdir -p /var/backups/almadi
sqlite3 /var/www/almadi/backend/data/almadi.db ".backup /var/backups/almadi/db-$DATE.sqlite"
tar czf /var/backups/almadi/uploads-$DATE.tar.gz -C /var/www/almadi/backend uploads
find /var/backups/almadi -mtime +30 -delete
```

---

## 5. Logos des moyens de paiement

Visa, Mastercard, American Express et Orange proviennent de la bibliothèque
**simple-icons** livrée avec le projet : ce sont les tracés officiels des marques.

**Wave n'existe dans aucune bibliothèque d'icônes libre.** Déposez le logo
officiel dans `frontend/public/payments/wave.svg` — voir
`frontend/public/payments/LISEZMOI.txt` pour la marche à suivre. Tant que le
fichier est absent, un libellé texte neutre est affiché.

---

## 6. Brancher un vrai paiement automatique (étape suivante)

Aujourd'hui, un paiement mobile est **confirmé manuellement** par le gérant :
la cliente transfère sur le numéro marchand et envoie la preuve, le gérant
marque la commande « payée ». C'est fiable, gratuit, et c'est ainsi que
fonctionne la majorité des boutiques de la sous-région au démarrage.

Pour automatiser, il faut un compte marchand chez un agrégateur
(PayDunya, CinetPay, Paydunya, Intouch, Hub2…) ; le point d'entrée est déjà
prévu :

1. Créer `backend/src/routes/payments.js` avec la route d'initialisation.
2. Ajouter la route de *webhook* qui reçoit la confirmation de l'agrégateur.
3. Dans ce webhook, **vérifier la signature** puis appeler
   `UPDATE orders SET payment_status='paid'` — jamais depuis le navigateur.

Le champ `payment_ref` de la table `orders` est prévu pour stocker
l'identifiant de transaction renvoyé par l'agrégateur.

---

## 7. Structure du projet

```
almadi-shop/
├── backend/
│   ├── src/
│   │   ├── server.js          # serveur Express, sécurité, routage
│   │   ├── db.js              # schéma SQLite + paramètres boutique
│   │   ├── seed.js            # données de démonstration
│   │   ├── lib/               # auth (JWT), produits, utilitaires
│   │   └── routes/            # shop · orders · auth · admin
│   ├── data/                  # base SQLite (à sauvegarder)
│   └── uploads/               # photos produits (à sauvegarder)
└── frontend/
    ├── public/                # icônes PWA, logo, logos de paiement
    └── src/
        ├── components/        # en-tête, panier, pied de page, logos paiement
        ├── pages/             # accueil, catalogue, produit, panier, commande, suivi
        ├── admin/             # tout le panel d'administration
        ├── store/             # panier, session, paramètres (zustand)
        └── lib/               # client API, formatage FR/GNF
```
