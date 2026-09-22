import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronRight, FiSearch, FiSliders } from 'react-icons/fi';
import { api } from '../lib/api';
import { useShop } from '../store/useShop';
import ProductCard from '../components/ProductCard';
import { SkeletonGrid, EmptyState } from '../components/ui';
import { SEASONS, formatPrice } from '../lib/format';

const SORTS = [
  { value: 'recent', label: 'Les plus récents' },
  { value: 'popular', label: 'Les plus vendus' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'rating', label: 'Les mieux notés' },
  { value: 'name', label: 'Ordre alphabétique' },
];

const PRICE_RANGES = [
  { label: 'Moins de 100 000 GNF', min: 0, max: 100000 },
  { label: '100 000 – 300 000 GNF', min: 100000, max: 300000 },
  { label: '300 000 – 600 000 GNF', min: 300000, max: 600000 },
  { label: 'Plus de 600 000 GNF', min: 600000, max: null },
];

export default function Shop() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { categories } = useShop();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useMemo(
    () => ({
      q: params.get('q') || '',
      category: slug || params.get('category') || '',
      season: params.get('season') || '',
      min: params.get('min') || '',
      max: params.get('max') || '',
      sort: params.get('sort') || 'recent',
      page: params.get('page') || '1',
      featured: params.get('featured') || '',
      new: params.get('new') || '',
      in_stock: params.get('in_stock') || '',
    }),
    [params, slug]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .products({ ...query, limit: 20 })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ items: [], total: 0, pages: 1, page: 1 }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query]);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '' || v === undefined) next.delete(k);
        else next.set(k, v);
      });
      if (!('page' in patch)) next.delete('page');
      setParams(next);
      setFiltersOpen(false);
    },
    [params, setParams]
  );

  const flatCats = useMemo(() => {
    const out = [];
    categories.forEach((c) => {
      out.push({ ...c, depth: 0 });
      (c.children || []).forEach((s) => out.push({ ...s, depth: 1 }));
    });
    return out;
  }, [categories]);

  const activeCategory = flatCats.find((c) => c.slug === query.category);
  const activeFilters = [
    query.q && { key: 'q', label: `« ${query.q} »` },
    query.category && { key: 'category', label: activeCategory?.name || query.category, clearSlug: !!slug },
    query.season && { key: 'season', label: SEASONS[query.season]?.label },
    (query.min || query.max) && {
      key: 'price',
      label: `${query.min ? formatPrice(query.min) : '0'} – ${query.max ? formatPrice(query.max) : '∞'}`,
    },
    query.featured === '1' && { key: 'featured', label: 'Coups de cœur' },
    query.new === '1' && { key: 'new', label: 'Nouveautés' },
    query.in_stock === '1' && { key: 'in_stock', label: 'En stock' },
  ].filter(Boolean);

  const clearFilter = (key) => {
    if (key === 'price') return update({ min: null, max: null });
    update({ [key]: null });
  };

  /* -------------------------- Panneau filtres ------------------------- */
  const Filters = () => (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900">Catégories</h3>
        <ul className="space-y-0.5">
          <li>
            <Link
              to="/boutique"
              className={`block rounded-lg px-3 py-2 text-sm transition ${!query.category ? 'bg-gold-50 font-semibold text-gold-800' : 'text-ink-600 hover:bg-ink-50'}`}
            >
              Toutes les catégories
            </Link>
          </li>
          {flatCats.map((c) => (
            <li key={c.id}>
              <Link
                to={`/categorie/${c.slug}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
                  ${c.depth ? 'pl-7' : ''}
                  ${query.category === c.slug ? 'bg-gold-50 font-semibold text-gold-800' : 'text-ink-600 hover:bg-ink-50'}`}
              >
                <span>{c.name}</span>
                <span className="text-xs text-ink-400">{c.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900">Saison</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SEASONS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => update({ season: query.season === key ? null : key })}
              className={`chip border transition ${
                query.season === key
                  ? 'border-gold-500 bg-gold-500 text-ink-950'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-400'
              }`}
            >
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900">Budget</h3>
        <ul className="space-y-1">
          {PRICE_RANGES.map((r) => {
            const active = String(query.min) === String(r.min) && String(query.max || '') === String(r.max || '');
            return (
              <li key={r.label}>
                <button
                  onClick={() => update(active ? { min: null, max: null } : { min: r.min, max: r.max })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-gold-50 font-semibold text-gold-800' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-900">Disponibilité</h3>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-50">
          <input
            type="checkbox"
            checked={query.in_stock === '1'}
            onChange={(e) => update({ in_stock: e.target.checked ? '1' : null })}
            className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500"
          />
          Uniquement les articles en stock
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-50">
          <input
            type="checkbox"
            checked={query.new === '1'}
            onChange={(e) => update({ new: e.target.checked ? '1' : null })}
            className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500"
          />
          Nouveautés seulement
        </label>
      </div>
    </div>
  );

  return (
    <div className="container-app py-6 sm:py-10">
      {/* Fil d'Ariane */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
        <Link to="/" className="hover:text-gold-600">Accueil</Link>
        <FiChevronRight className="h-3 w-3" />
        <Link to="/boutique" className="hover:text-gold-600">Boutique</Link>
        {activeCategory && (
          <>
            <FiChevronRight className="h-3 w-3" />
            <span className="font-semibold text-ink-900">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">
            {query.q ? `Résultats pour « ${query.q} »` : activeCategory ? activeCategory.name : 'Tous les produits'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {loading ? 'Chargement…' : `${data?.total || 0} article${(data?.total || 0) > 1 ? 's' : ''} disponible${(data?.total || 0) > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(true)} className="btn-outline btn-sm lg:hidden">
            <FiFilter className="h-4 w-4" /> Filtrer
            {activeFilters.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {activeFilters.length}
              </span>
            )}
          </button>

          <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2">
            <FiSliders className="h-4 w-4 shrink-0 text-ink-400" />
            <select
              value={query.sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="bg-transparent text-sm font-medium outline-none"
              aria-label="Trier les produits"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) =>
            f.clearSlug ? (
              <Link key={f.key} to="/boutique" className="chip border border-ink-200 bg-white text-ink-700 hover:border-rose-400 hover:text-rose-600">
                {f.label} <FiX className="h-3 w-3" />
              </Link>
            ) : (
              <button key={f.key} onClick={() => clearFilter(f.key)} className="chip border border-ink-200 bg-white text-ink-700 transition hover:border-rose-400 hover:text-rose-600">
                {f.label} <FiX className="h-3 w-3" />
              </button>
            )
          )}
          <Link to="/boutique" className="text-xs font-semibold text-ink-500 underline hover:text-ink-900">
            Tout effacer
          </Link>
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28">
            <Filters />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <SkeletonGrid count={8} />
          ) : data?.items?.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {data.pages > 1 && (
                <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  <button
                    disabled={data.page <= 1}
                    onClick={() => update({ page: data.page - 1 })}
                    className="btn-outline btn-sm"
                  >
                    Précédent
                  </button>
                  {Array.from({ length: data.pages }).slice(0, 7).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => update({ page: i + 1 })}
                      className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
                        data.page === i + 1 ? 'bg-ink-950 text-white' : 'border border-ink-200 text-ink-600 hover:border-ink-400'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={data.page >= data.pages}
                    onClick={() => update({ page: data.page + 1 })}
                    className="btn-outline btn-sm"
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              icon={FiSearch}
              title="Aucun article ne correspond"
              description="Essayez d'élargir votre recherche ou de retirer certains filtres."
              action={<Link to="/boutique" className="btn-gold">Voir tous les produits</Link>}
            />
          )}
        </div>
      </div>

      {/* Filtres mobile */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Filtrer</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-lg p-2 hover:bg-ink-50" aria-label="Fermer">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <Filters />
            <button onClick={() => setFiltersOpen(false)} className="btn-gold mt-6 w-full">
              Voir les résultats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
