import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiStar, FiAlertTriangle, FiCheck, FiX, FiSave,
} from 'react-icons/fi';
import { adminApi, mediaUrl } from '../lib/api';
import { Spinner, useToast, EmptyState } from '../components/ui';
import { formatPrice, SEASONS } from '../lib/format';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState(null);
  const [stockValue, setStockValue] = useState('');

  const q = params.get('q') || '';
  const status = params.get('status') || 'all';
  const low = params.get('low') || '';
  const page = params.get('page') || '1';

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .products({ q, status, low, page, limit: 20, sort: 'recent' })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [q, status, low, page, toast]);

  useEffect(() => { load(); }, [load]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  const patch = async (id, body, message) => {
    try {
      await adminApi.patchProduct(id, body);
      toast.success(message);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer définitivement « ${p.name} » ?\nCette action est irréversible.`)) return;
    try {
      await adminApi.deleteProduct(p.id);
      toast.success('Produit supprimé');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveStock = async (p) => {
    const value = parseInt(stockValue, 10);
    if (Number.isNaN(value) || value < 0) return toast.error('Quantité invalide');
    await patch(p.id, { stock: value }, `Stock de « ${p.name} » mis à jour`);
    setEditingStock(null);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Produits</h1>
          <p className="mt-1 text-sm text-ink-500">
            {data ? `${data.total} produit(s) au catalogue` : 'Chargement…'}
          </p>
        </div>
        <Link to="/admin/produits/nouveau" className="btn-gold btn-sm">
          <FiPlus className="h-4 w-4" /> Nouveau produit
        </Link>
      </header>

      {/* Filtres */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, référence ou mot-clé…"
            defaultValue={q}
            onKeyDown={(e) => e.key === 'Enter' && update({ q: e.target.value })}
          />
        </div>

        <select value={status} onChange={(e) => update({ status: e.target.value })} className="input w-auto">
          <option value="all">Tous les statuts</option>
          <option value="active">En ligne</option>
          <option value="draft">Brouillon</option>
          <option value="archived">Archivé</option>
        </select>

        <button
          onClick={() => update({ low: low ? '' : '1' })}
          className={`btn-sm ${low ? 'btn-primary' : 'btn-outline'}`}
        >
          <FiAlertTriangle className="h-3.5 w-3.5" /> Stock faible
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-gold-600" /></div>
      ) : !data?.items.length ? (
        <EmptyState
          title="Aucun produit trouvé"
          description="Modifiez vos filtres ou ajoutez un premier produit."
          action={<Link to="/admin/produits/nouveau" className="btn-gold">Ajouter un produit</Link>}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produit</th>
                    <th className="px-4 py-3 font-semibold">Catégorie</th>
                    <th className="px-4 py-3 font-semibold">Prix</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Ventes</th>
                    <th className="px-4 py-3 font-semibold">État</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map((p) => (
                    <tr key={p.id} className="transition hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img src={mediaUrl(p.image)} alt="" className="h-12 w-11 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="h-12 w-11 shrink-0 rounded-lg bg-ink-100" />
                          )}
                          <div className="min-w-0">
                            <Link to={`/admin/produits/${p.id}`} className="block max-w-[260px] truncate font-medium text-ink-950 hover:text-gold-700">
                              {p.name}
                            </Link>
                            <p className="text-xs text-ink-400">
                              {p.sku} {p.season && `· ${SEASONS[p.season]?.short || p.season}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-ink-600">{p.category?.name || '—'}</td>

                      <td className="px-4 py-3">
                        <p className="font-semibold">{formatPrice(p.price)}</p>
                        {p.comparePrice > p.price && (
                          <p className="text-xs text-ink-400 line-through">{formatPrice(p.comparePrice)}</p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editingStock === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="0" autoFocus
                              className="w-20 rounded-lg border border-gold-400 px-2 py-1 text-sm"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveStock(p)}
                            />
                            <button onClick={() => saveStock(p)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Enregistrer">
                              <FiSave className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingStock(null)} className="rounded p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Annuler">
                              <FiX className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingStock(p.id); setStockValue(String(p.stock)); }}
                            className={`chip ${
                              p.stock === 0 ? 'bg-rose-100 text-rose-800'
                                : p.stockState === 'low' ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                            title="Cliquez pour modifier le stock"
                          >
                            {p.stock === 0 ? 'Rupture' : `${p.stock} en stock`}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-ink-600">{p.soldCount}</td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`chip w-fit ${
                            p.status === 'active' ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'draft' ? 'bg-ink-100 text-ink-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.status === 'active' ? 'En ligne' : p.status === 'draft' ? 'Brouillon' : 'Archivé'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => patch(p.id, { isFeatured: !p.isFeatured },
                              p.isFeatured ? 'Retiré des coups de cœur' : 'Ajouté aux coups de cœur')}
                            className={`rounded-lg p-2 transition ${p.isFeatured ? 'text-gold-600 hover:bg-gold-50' : 'text-ink-300 hover:bg-ink-100 hover:text-ink-600'}`}
                            title={p.isFeatured ? 'Retirer des coups de cœur' : 'Mettre en coup de cœur'}
                          >
                            <FiStar className={`h-4 w-4 ${p.isFeatured ? 'fill-gold-500' : ''}`} />
                          </button>

                          <button
                            onClick={() => patch(p.id, { outOfStock: p.stock > 0 },
                              p.stock > 0 ? 'Produit marqué en rupture' : 'Produit remis en stock')}
                            className={`rounded-lg p-2 transition ${p.stock === 0 ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                            title={p.stock > 0 ? 'Marquer en rupture' : 'Remettre en stock'}
                          >
                            {p.stock === 0 ? <FiCheck className="h-4 w-4" /> : <FiAlertTriangle className="h-4 w-4" />}
                          </button>

                          <Link to={`/admin/produits/${p.id}`} className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900" title="Modifier">
                            <FiEdit2 className="h-4 w-4" />
                          </Link>

                          <button onClick={() => remove(p)} className="rounded-lg p-2 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600" title="Supprimer">
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pages > 1 && (
            <nav className="flex justify-center gap-2">
              {Array.from({ length: data.pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => update({ page: String(i + 1) })}
                  className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
                    data.page === i + 1 ? 'bg-ink-950 text-white' : 'border border-ink-200 bg-white hover:border-ink-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
