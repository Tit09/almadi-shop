import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid, FiBox, FiShoppingCart, FiTag, FiTruck, FiUsers, FiStar,
  FiSettings, FiLogOut, FiMenu, FiX, FiExternalLink, FiImage, FiPercent,
} from 'react-icons/fi';
import { useAuth } from '../store/useAuth';
import { Spinner } from '../components/ui';

const NAV = [
  { to: '/admin', end: true, icon: FiGrid, label: 'Tableau de bord' },
  { to: '/admin/commandes', icon: FiShoppingCart, label: 'Commandes' },
  { to: '/admin/produits', icon: FiBox, label: 'Produits' },
  { to: '/admin/categories', icon: FiTag, label: 'Catégories' },
  { to: '/admin/livraison', icon: FiTruck, label: 'Livraison' },
  { to: '/admin/promotions', icon: FiPercent, label: 'Codes promo' },
  { to: '/admin/bannieres', icon: FiImage, label: 'Bannières' },
  { to: '/admin/clients', icon: FiUsers, label: 'Clients' },
  { to: '/admin/avis', icon: FiStar, label: 'Avis' },
  { to: '/admin/parametres', icon: FiSettings, label: 'Paramètres' },
];

export default function AdminLayout() {
  const { user, ready, bootstrap, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!ready) bootstrap(); }, [ready, bootstrap]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (ready && (!user || user.role !== 'admin')) navigate('/admin/connexion', { replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner className="h-8 w-8 text-gold-600" />
      </div>
    );
  }

  const Sidebar = (
    <div className="flex h-full flex-col bg-ink-950 text-ink-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <img src="/logo-almadi.png" alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-white">Almadi Shop</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-gold-500">Administration</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-gold-500 text-ink-950' : 'text-ink-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-ink-300 transition hover:bg-white/5 hover:text-white">
          <FiExternalLink className="h-4 w-4" /> Voir la boutique
        </Link>
        <div className="rounded-xl bg-white/5 px-3.5 py-3">
          <p className="truncate text-xs font-semibold text-white">{user.name}</p>
          <p className="truncate text-[11px] text-ink-400">{user.email}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/admin/connexion'); }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-rose-400 transition hover:bg-rose-500/10"
        >
          <FiLogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{Sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            {Sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Fermer">
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-ink-50" aria-label="Menu">
            <FiMenu className="h-5 w-5" />
          </button>
          <span className="font-display font-bold">Administration</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
