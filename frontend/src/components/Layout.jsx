import { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { FiDownload, FiX, FiHome, FiGrid, FiShoppingBag, FiUser } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import { useShop } from '../store/useShop';
import { useCart } from '../store/useCart';
import { whatsappLink } from '../lib/format';

/** Invitation à installer l'application (PWA) — Android / Chrome / Edge. */
function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('almadi_install_dismissed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || hidden) return null;

  const install = async () => {
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem('almadi_install_dismissed', '1'); } catch { /* ignoré */ }
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] animate-fade-up rounded-2xl border border-gold-200 bg-white p-4 shadow-lift sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div className="flex-1">
          <p className="text-sm font-bold text-ink-950">Installer Almadi Shop</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Ajoutez la boutique à votre écran d'accueil : plus rapide et consultable même avec une connexion faible.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="btn-gold btn-sm">
              <FiDownload className="h-3.5 w-3.5" /> Installer
            </button>
            <button onClick={dismiss} className="btn-ghost btn-sm">Plus tard</button>
          </div>
        </div>
        <button onClick={dismiss} className="text-ink-300 hover:text-ink-600" aria-label="Fermer">
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Barre de navigation basse, réflexe mobile en Afrique de l'Ouest. */
function MobileTabBar() {
  const { pathname } = useLocation();
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);

  const tabs = [
    { to: '/', icon: FiHome, label: 'Accueil' },
    { to: '/boutique', icon: FiGrid, label: 'Boutique' },
    { action: openCart, icon: FiShoppingBag, label: 'Panier', badge: count },
    { to: '/compte', icon: FiUser, label: 'Compte' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[55] border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-4">
        {tabs.map((tab, i) => {
          const active = tab.to && (tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to));
          const Icon = tab.icon;
          const inner = (
            <>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink-950">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </>
          );
          const cls = `flex flex-col items-center gap-1 py-2.5 transition ${active ? 'text-gold-600' : 'text-ink-500'}`;
          return tab.to ? (
            <Link key={i} to={tab.to} className={cls}>{inner}</Link>
          ) : (
            <button key={i} onClick={tab.action} className={cls}>{inner}</button>
          );
        })}
      </div>
    </nav>
  );
}

export default function Layout() {
  const { settings, load } = useShop();
  const { pathname } = useLocation();

  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <InstallBanner />
      <MobileTabBar />

      {settings?.whatsapp && (
        <a
          href={whatsappLink(settings.whatsapp, 'Bonjour Almadi Shop, je souhaite une information sur un article.')}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Écrire sur WhatsApp"
          className="fixed bottom-24 right-4 z-[56] flex items-center justify-center rounded-full bg-[#25D366] p-3.5 text-white shadow-lift transition hover:scale-105 lg:bottom-6 lg:right-6"
        >
          <SiWhatsapp className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
