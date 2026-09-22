import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiShoppingBag, FiUser, FiMenu, FiX, FiPhone, FiChevronDown,
  FiPackage, FiTruck, FiLogOut, FiGrid,
} from 'react-icons/fi';
import { api, mediaUrl } from '../lib/api';
import { useCart } from '../store/useCart';
import { useShop } from '../store/useShop';
import { useAuth } from '../store/useAuth';
import { formatPrice } from '../lib/format';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, categories } = useShop();
  const { user, logout } = useAuth();
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowSuggest(false);
    setOpenMenu(null);
  }, [location.pathname]);

  // Autocomplétion : 250 ms de latence pour ne pas marteler l'API.
  useEffect(() => {
    if (query.trim().length < 2) return setSuggestions([]);
    const t = setTimeout(() => {
      api.suggest(query.trim()).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggest(false);
    navigate(`/boutique?q=${encodeURIComponent(query.trim())}`);
  };

  const phone = settings?.phone || '+224 625 00 33 39';

  return (
    <>
      {/* Bandeau annonce */}
      {settings?.announcement && (
        <div className="hidden bg-ink-950 py-2 text-center text-xs text-white sm:block">
          <div className="container-app flex items-center justify-between gap-4">
            <p className="flex items-center gap-2">
              <FiTruck className="h-3.5 w-3.5 text-gold-400" />
              {settings.announcement}
            </p>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 font-semibold text-gold-400 hover:text-gold-300">
              <FiPhone className="h-3.5 w-3.5" /> {phone}
            </a>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow ${
          scrolled ? 'border-ink-100 shadow-card' : 'border-transparent'
        }`}
      >
        <div className="container-app flex h-16 items-center gap-3 sm:h-20 sm:gap-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded-lg p-2 text-ink-700 transition hover:bg-ink-50 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <FiMenu className="h-6 w-6" />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo-almadi.png" alt="Almadi Shop" className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg font-bold tracking-tight text-ink-950">Almadi Shop</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">Conakry · Guinée</span>
            </span>
          </Link>

          {/* Recherche */}
          <div ref={searchRef} className="relative flex-1">
            <form onSubmit={submitSearch}>
              <div className="flex items-center overflow-hidden rounded-xl border border-ink-200 bg-white transition focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-200">
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Rechercher une robe, un sac, un cartable…"
                  className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-ink-400"
                  aria-label="Rechercher un produit"
                />
                <button type="submit" className="flex h-10 items-center gap-2 bg-ink-950 px-4 text-white transition hover:bg-gold-500 hover:text-ink-950 sm:px-5" aria-label="Lancer la recherche">
                  <FiSearch className="h-4 w-4" />
                  <span className="hidden text-sm font-semibold sm:inline">Chercher</span>
                </button>
              </div>
            </form>

            {showSuggest && suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lift">
                {suggestions.map((s) => (
                  <Link
                    key={s.slug}
                    to={`/produit/${s.slug}`}
                    className="flex items-center gap-3 border-b border-ink-50 px-3 py-2.5 transition last:border-0 hover:bg-ink-50"
                    onClick={() => { setShowSuggest(false); setQuery(''); }}
                  >
                    {s.image ? (
                      <img src={mediaUrl(s.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="h-10 w-10 rounded-lg bg-ink-100" />
                    )}
                    <span className="flex-1 truncate text-sm text-ink-800">{s.name}</span>
                    <span className="text-xs font-bold text-ink-950">{formatPrice(s.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <div className="group relative hidden sm:block">
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50">
                <FiUser className="h-5 w-5" />
                <span className="hidden max-w-[90px] truncate lg:inline">
                  {user ? user.name.split(' ')[0] : 'Compte'}
                </span>
                <FiChevronDown className="hidden h-3.5 w-3.5 lg:inline" />
              </button>
              <div className="invisible absolute right-0 top-full w-56 translate-y-1 rounded-xl border border-ink-100 bg-white p-1.5 opacity-0 shadow-lift transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {user ? (
                  <>
                    <p className="px-3 py-2 text-xs text-ink-500">Connecté en tant que<br /><span className="font-semibold text-ink-900">{user.email}</span></p>
                    <Link to="/compte" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink-50"><FiPackage className="h-4 w-4" /> Mes commandes</Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gold-700 hover:bg-gold-50"><FiGrid className="h-4 w-4" /> Panel admin</Link>
                    )}
                    <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><FiLogOut className="h-4 w-4" /> Se déconnecter</button>
                  </>
                ) : (
                  <>
                    <Link to="/connexion" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-ink-50">Se connecter</Link>
                    <Link to="/connexion?mode=inscription" className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-50">Créer un compte</Link>
                    <Link to="/suivi" className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-50">Suivre une commande</Link>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={openCart}
              className="relative rounded-lg p-2.5 text-ink-800 transition hover:bg-ink-50"
              aria-label={`Panier — ${count} article(s)`}
            >
              <FiShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold-500 px-1 text-[11px] font-bold text-ink-950">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation catégories (bureau) */}
        <nav className="hidden border-t border-ink-100 lg:block">
          <div className="container-app flex items-center gap-1">
            <NavLink to="/boutique" className={({ isActive }) => `flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${isActive ? 'border-gold-500 text-gold-700' : 'border-transparent text-ink-800 hover:text-gold-600'}`}>
              <FiGrid className="h-4 w-4" /> Tous les produits
            </NavLink>

            {categories.map((cat) => (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => setOpenMenu(cat.id)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link
                  to={`/categorie/${cat.slug}`}
                  className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-800 transition hover:border-gold-500 hover:text-gold-600"
                >
                  {cat.name}
                  {cat.children?.length > 0 && <FiChevronDown className="h-3.5 w-3.5" />}
                </Link>

                {cat.children?.length > 0 && openMenu === cat.id && (
                  <div className="absolute left-0 top-full z-50 w-64 rounded-b-xl border border-t-0 border-ink-100 bg-white p-2 shadow-lift">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/categorie/${sub.slug}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-ink-700 transition hover:bg-gold-50 hover:text-gold-800"
                      >
                        {sub.name}
                        <span className="text-xs text-ink-400">{sub.productCount}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <span className="ml-auto flex items-center gap-4 py-3 text-xs">
              <Link to="/suivi" className="flex items-center gap-1.5 font-medium text-ink-600 hover:text-gold-600">
                <FiTruck className="h-4 w-4" /> Suivre ma commande
              </Link>
            </span>
          </div>
        </nav>
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-fade-up flex-col bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 p-4">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo-almadi.png" alt="" className="h-9 w-9" />
                <span className="font-display text-base font-bold">Almadi Shop</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-ink-50" aria-label="Fermer">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <Link to="/boutique" className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-ink-50">
                Tous les produits
              </Link>
              {categories.map((cat) => (
                <details key={cat.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold hover:bg-ink-50">
                    {cat.name}
                    {cat.children?.length > 0 && <FiChevronDown className="h-4 w-4 transition group-open:rotate-180" />}
                  </summary>
                  <div className="ml-3 border-l border-ink-100 pl-2">
                    <Link to={`/categorie/${cat.slug}`} className="block rounded-lg px-4 py-2 text-sm text-gold-700">
                      Voir tout « {cat.name} »
                    </Link>
                    {cat.children?.map((sub) => (
                      <Link key={sub.id} to={`/categorie/${sub.slug}`} className="block rounded-lg px-4 py-2 text-sm text-ink-600 hover:bg-ink-50">
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}

              <div className="my-3 border-t border-ink-100" />
              <Link to="/suivi" className="block rounded-xl px-4 py-3 text-sm hover:bg-ink-50">Suivre ma commande</Link>
              <Link to="/compte" className="block rounded-xl px-4 py-3 text-sm hover:bg-ink-50">Mon compte</Link>
              <Link to="/page/livraison" className="block rounded-xl px-4 py-3 text-sm hover:bg-ink-50">Livraison & retours</Link>
              <Link to="/page/contact" className="block rounded-xl px-4 py-3 text-sm hover:bg-ink-50">Nous contacter</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="block rounded-xl bg-gold-50 px-4 py-3 text-sm font-semibold text-gold-800">Panel administrateur</Link>
              )}
            </div>

            <a href={`tel:${phone.replace(/\s/g, '')}`} className="m-3 flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white">
              <FiPhone className="h-4 w-4" /> {phone}
            </a>
          </aside>
        </div>
      )}
    </>
  );
}
