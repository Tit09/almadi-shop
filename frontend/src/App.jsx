// import { useEffect } from 'react';
// import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// import { ToastProvider } from './components/ui';
// import { useAuth } from './store/useAuth';

// import Layout from './components/Layout';
// import Home from './pages/Home';
// import Shop from './pages/Shop';
// import Product from './pages/Product';
// import Cart from './pages/Cart';
// import Checkout from './pages/Checkout';
// import OrderSuccess from './pages/OrderSuccess';
// import Track from './pages/Track';
// import Account, { Login } from './pages/Account';
// import StaticPage from './pages/StaticPage';

// import AdminLayout from './admin/AdminLayout';
// import AdminLogin from './admin/AdminLogin';
// import Dashboard from './admin/Dashboard';
// import Products from './admin/Products';
// import ProductForm from './admin/ProductForm';
// import { Orders, OrderDetail } from './admin/Orders';
// import { Categories, Delivery, Promotions, Banners, Customers, Reviews } from './admin/Catalog';
// import Settings from './admin/Settings';
// import i18n from 'i18next';
// import { initReactI18next } from 'react-i18next';
// function NotFound() {
//   return (
//     <div className="container-app py-24 text-center">
//       <p className="font-display text-6xl font-bold text-gold-500">404</p>
//       <h1 className="mt-4 section-title">Cette page n'existe pas</h1>
//       <p className="mt-2 text-sm text-ink-500">
//         Le lien est peut-être erroné, ou la page a été déplacée.
//       </p>
//       <div className="mt-8 flex flex-wrap justify-center gap-3">
//         <Link to="/" className="btn-gold">Retour à l'accueil</Link>
//         <Link to="/boutique" className="btn-outline">Voir la boutique</Link>
//       </div>
//     </div>
//   );
// }

// export default function App() {
//   const bootstrap = useAuth((s) => s.bootstrap);
//   useEffect(() => { bootstrap(); }, [bootstrap]);



//   return (
//     <ToastProvider>
//       <BrowserRouter>
//         <Routes>
//           {/* ---------------------------- Boutique ---------------------------- */}
//           <Route element={<Layout />}>
//             <Route index element={<Home />} />
//             <Route path="boutique" element={<Shop />} />
//             <Route path="categorie/:slug" element={<Shop />} />
//             <Route path="produit/:slug" element={<Product />} />
//             <Route path="panier" element={<Cart />} />
//             <Route path="commande" element={<Checkout />} />
//             <Route path="commande/confirmee" element={<OrderSuccess />} />
//             <Route path="suivi" element={<Track />} />
//             <Route path="compte" element={<Account />} />
//             <Route path="connexion" element={<Login />} />
//             <Route path="page/:slug" element={<StaticPage />} />
//             <Route path="*" element={<NotFound />} />
//           </Route>

//           {/* ------------------------- Administration ------------------------- */}
//           <Route path="/admin/connexion" element={<AdminLogin />} />
//           <Route path="/admin" element={<AdminLayout />}>
//             <Route index element={<Dashboard />} />
//             <Route path="commandes" element={<Orders />} />
//             <Route path="commandes/:id" element={<OrderDetail />} />
//             <Route path="produits" element={<Products />} />
//             <Route path="produits/nouveau" element={<ProductForm />} />
//             <Route path="produits/:id" element={<ProductForm />} />
//             <Route path="categories" element={<Categories />} />
//             <Route path="livraison" element={<Delivery />} />
//             <Route path="promotions" element={<Promotions />} />
//             <Route path="bannieres" element={<Banners />} />
//             <Route path="clients" element={<Customers />} />
//             <Route path="avis" element={<Reviews />} />
//             <Route path="parametres" element={<Settings />} />
//           </Route>
//         </Routes>
//       </BrowserRouter>
//     </ToastProvider>
//   );
// }
import { useEffect, useState, createContext } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { useAuth } from './store/useAuth';

import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Track from './pages/Track';
import Account, { Login } from './pages/Account';
import StaticPage from './pages/StaticPage';

import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import Products from './admin/Products';
import ProductForm from './admin/ProductForm';
import { Orders, OrderDetail } from './admin/Orders';
import { Categories, Delivery, Promotions, Banners, Customers, Reviews } from './admin/Catalog';
import Settings from './admin/Settings';

// 🌐 1. Configuration initiale et propre de i18next (à l'extérieur du composant)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: { welcome: "Nos Articles du Moment", offices: "Nos Bureaux & Contacts", delivery: "Livraison Rapide" } },
      en: { translation: { welcome: "Our Featured Items", offices: "Our Offices & Contacts", delivery: "Fast Delivery" } },
      zh: { translation: { welcome: "热门商品", offices: "我们的办公室与联络方式", delivery: "快速送达" } },
      es: { translation: { welcome: "Nuestros Artículos del Momento", offices: "Nuestras Oficinas y Contactos", delivery: "Envío Rápido" } },
      ar: { translation: { welcome: "الأصناف المميزة لدينا", offices: "مكاتبنا وجهات الاتصال", delivery: "الشحن السريع" } }
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
  });

// 💱 2. Création du Context global pour partager la devise et les fonctions de prix
export const CurrencyContext = createContext();

// Table des taux de change par rapport au Franc Guinéen (GNF)
const EXCHANGE_RATES = {
  GNF: 1,
  XOF: 0.071,   // Franc CFA
  USD: 0.00012,  // Dollar Américain
  EUR: 0.00011,  // Euro
  CNY: 0.00085,  // Yuan Chinois
  CAD: 0.00016   // Dollar Canadien
};

const CURRENCY_SYMBOLS = {
  GNF: "GNF", XOF: "CFA", USD: "", EUR: "€", CNY: "¥", CAD: "CA"
};

function NotFound() {
  return (
    <div className="container-app py-24 text-center">
      <p className="font-display text-6xl font-bold text-gold-500">404</p>
      <h1 className="mt-4 section-title">Cette page n'existe pas</h1>
      <p className="mt-2 text-sm text-ink-500">
        Le lien est peut-être erroné, ou la page a été déplacée.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-gold">Retour à l'accueil</Link>
        <Link to="/boutique" className="btn-outline">Voir la boutique</Link>
      </div>
    </div>
  );
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const [currency, setCurrency] = useState('GNF');

  useEffect(() => {
    bootstrap();

    // 🌍 Détection automatique du pays et continent par adresse IP
    fetch('https://ipapi.co')
      .then((res) => res.json())
      .then((data) => {
        const country = data.country_code; // Ex: 'GN', 'SN', 'FR', 'US'
        const continent = data.continent_code; // Ex: 'AF', 'EU'

        // 💱 Ajustement de la devise selon la localisation
        if (country === 'GN') {
          setCurrency('GNF');
        } else if (['SN', 'CI', 'BF', 'ML', 'NE', 'TG', 'BJ', 'GW'].includes(country)) {
          setCurrency('XOF'); // Zone CFA
        } else if (['FR', 'DE', 'ES', 'IT', 'BE'].includes(country)) {
          setCurrency('EUR'); // Europe
        } else if (country === 'CA') {
          setCurrency('CAD'); // Canada
        } else if (country === 'CN') {
          setCurrency('CNY'); // Chine
        } else {
          setCurrency('USD'); // Reste du monde
        }

        // 🌐 Ajustement de la langue selon la localisation
        if (['GN', 'SN', 'CI', 'BF', 'ML', 'NE', 'TG', 'BJ', 'FR', 'BE'].includes(country)) {
          i18n.changeLanguage('fr');
        } else if (['ES', 'MX', 'AR'].includes(country)) {
          i18n.changeLanguage('es');
        } else if (continent === 'AF' && data.languages?.includes('ar')) {
          i18n.changeLanguage('ar');
        } else if (country === 'CN') {
          i18n.changeLanguage('zh');
        } else {
          i18n.changeLanguage('en');
        }
      })
      .catch((err) => {
        console.warn("Échec de la géolocalisation, valeurs GNF/FR par défaut appliquées.", err);
      });
  }, [bootstrap]);

  // 💱 Fonction de prix double affichage (Style Alibaba / Amazon)
  const formatPrice = (priceInGNF) => {
    const originalPrice = priceInGNF.toLocaleString(undefined, { minimumFractionDigits: 0 }) + " GNF";

    // Si le client choisit de voir en GNF, on affiche simplement le prix brut
    if (currency === 'GNF') {
      return originalPrice;
    }

    // Sinon, on calcule la conversion et on affiche les deux monnaies
    const rate = EXCHANGE_RATES[currency] || 1;
    const converted = (priceInGNF * rate).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    const convertedPrice = `${converted} ${CURRENCY_SYMBOLS[currency]}`;

    return `${convertedPrice} (approx. ${originalPrice})`;
  };

  return (
    <ToastProvider>
      {/* Distribution des outils de conversion à l'ensemble des pages */}
      <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, EXCHANGE_RATES, CURRENCY_SYMBOLS }}>
        <BrowserRouter>
          <Routes>
            {/* ---------------------------- Boutique ---------------------------- */}
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="boutique" element={<Shop />} />
              <Route path="categorie/:slug" element={<Shop />} />
              <Route path="produit/:slug" element={<Product />} />
              <Route path="panier" element={<Cart />} />
              <Route path="commande" element={<Checkout />} />
              <Route path="commande/confirmee" element={<OrderSuccess />} />
              <Route path="suivi" element={<Track />} />
              <Route path="compte" element={<Account />} />
              <Route path="connexion" element={<Login />} />
              <Route path="page/:slug" element={<StaticPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* ------------------------- Administration ------------------------- */}
            <Route path="/admin/connexion" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="commandes" element={<Orders />} />
              <Route path="commandes/:id" element={<OrderDetail />} />
              <Route path="produits" element={<Products />} />
              <Route path="produits/nouveau" element={<ProductForm />} />
              <Route path="produits/:id" element={<ProductForm />} />
              <Route path="categories" element={<Categories />} />
              <Route path="livraison" element={<Delivery />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="bannieres" element={<Banners />} />
              <Route path="clients" element={<Customers />} />
              <Route path="avis" element={<Reviews />} />
              <Route path="parametres" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CurrencyContext.Provider>
    </ToastProvider>
  );
}
