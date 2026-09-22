import { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiTruck, FiTag, FiImage, FiPercent } from 'react-icons/fi';
import { adminApi } from '../lib/api';
import { Spinner, useToast, EmptyState } from '../components/ui';
import { formatPrice, formatDate, SEASONS } from '../lib/format';

/* ====================== Bloc formulaire réutilisable ====================== */
function Panel({ title, description, children, onAdd, addLabel = 'Ajouter' }) {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {onAdd && (
          <button onClick={onAdd} className="btn-gold btn-sm">
            <FiPlus className="h-4 w-4" /> {addLabel}
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

/* ============================== Catégories ============================== */
export function Categories() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    adminApi.categories().then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const blank = { name: '', description: '', parentId: '', season: '', sortOrder: 0, isActive: true };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await adminApi.updateCategory(editing.id, editing);
      else await adminApi.createCategory(editing);
      toast.success(editing.id ? 'Catégorie modifiée' : 'Catégorie créée');
      setEditing(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?\nLes produits associés ne seront pas supprimés.`)) return;
    try { await adminApi.deleteCategory(c.id); toast.success('Catégorie supprimée'); load(); }
    catch (e) { toast.error(e.message); }
  };

  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const parents = rows.filter((r) => !r.parent_id);

  return (
    <Panel
      title="Catégories"
      description="Organisez le catalogue par rayon et par saison."
      onAdd={() => setEditing({ ...blank })}
      addLabel="Nouvelle catégorie"
    >
      {editing && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editing.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h2>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 hover:bg-ink-100" aria-label="Fermer">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input required className="input" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Catégorie parente</label>
              <select className="input" value={editing.parentId || ''}
                onChange={(e) => setEditing({ ...editing, parentId: e.target.value })}>
                <option value="">Aucune (rayon principal)</option>
                {parents.filter((p) => p.id !== editing.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Saison</label>
              <select className="input" value={editing.season || ''}
                onChange={(e) => setEditing({ ...editing, season: e.target.value })}>
                <option value="">Non précisée</option>
                {Object.entries(SEASONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ordre d'affichage</label>
              <input type="number" className="input" value={editing.sortOrder ?? 0}
                onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input className="input" value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={!!editing.isActive}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
            Catégorie visible sur la boutique
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn-gold btn-sm"><FiSave className="h-4 w-4" /> Enregistrer</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost btn-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Saison</th>
                <th className="px-4 py-3 font-semibold">Produits</th>
                <th className="px-4 py-3 font-semibold">État</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((c) => (
                <tr key={c.id} className="transition hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <span className={c.parent_id ? 'pl-5 text-ink-600' : 'font-semibold'}>
                      {c.parent_id ? '— ' : ''}{c.name}
                    </span>
                    <p className="text-xs text-ink-400">/{c.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{SEASONS[c.season]?.short || '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{c.product_count}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'}`}>
                      {c.is_active ? 'Visible' : 'Masquée'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing({
                          id: c.id, name: c.name, description: c.description, parentId: c.parent_id || '',
                          season: c.season || '', sortOrder: c.sort_order, isActive: !!c.is_active,
                        })}
                        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" title="Modifier"
                      ><FiEdit2 className="h-4 w-4" /></button>
                      <button onClick={() => remove(c)} className="rounded-lg p-2 text-ink-300 hover:bg-rose-50 hover:text-rose-600" title="Supprimer">
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
    </Panel>
  );
}

/* ============================== Livraison ============================== */
export function Delivery() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    adminApi.zones().then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const blank = { name: '', region: 'Conakry', fee: 0, delay: '', sortOrder: 0, isActive: true };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await adminApi.updateZone(editing.id, editing);
      else await adminApi.createZone(editing);
      toast.success('Zone enregistrée');
      setEditing(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (z) => {
    if (!window.confirm(`Supprimer la zone « ${z.name} » ?`)) return;
    try { await adminApi.deleteZone(z.id); toast.success('Zone supprimée'); load(); }
    catch (e) { toast.error(e.message); }
  };

  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  return (
    <Panel
      title="Zones de livraison"
      description="Chaque zone a son tarif et son délai. Le client la choisit avant de payer."
      onAdd={() => setEditing({ ...blank })}
      addLabel="Nouvelle zone"
    >
      {editing && (
        <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <label className="label">Zone *</label>
            <input required className="input" value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ratoma" />
          </div>
          <div>
            <label className="label">Région</label>
            <input className="input" value={editing.region}
              onChange={(e) => setEditing({ ...editing, region: e.target.value })} placeholder="Conakry" />
          </div>
          <div>
            <label className="label">Frais (GNF)</label>
            <input type="number" min="0" className="input" value={editing.fee}
              onChange={(e) => setEditing({ ...editing, fee: e.target.value })} />
          </div>
          <div>
            <label className="label">Délai</label>
            <input className="input" value={editing.delay || ''}
              onChange={(e) => setEditing({ ...editing, delay: e.target.value })} placeholder="24 h" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold btn-sm flex-1"><FiSave className="h-4 w-4" /> Enregistrer</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost btn-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Région</th>
                <th className="px-4 py-3 font-semibold">Frais</th>
                <th className="px-4 py-3 font-semibold">Délai</th>
                <th className="px-4 py-3 font-semibold">État</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((z) => (
                <tr key={z.id} className="transition hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-medium">{z.name}</td>
                  <td className="px-4 py-3 text-ink-600">{z.region}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(z.fee)}</td>
                  <td className="px-4 py-3 text-ink-600">{z.delay || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${z.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'}`}>
                      {z.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing({
                          id: z.id, name: z.name, region: z.region, fee: z.fee,
                          delay: z.delay, sortOrder: z.sort_order, isActive: !!z.is_active,
                        })}
                        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                      ><FiEdit2 className="h-4 w-4" /></button>
                      <button onClick={() => remove(z)} className="rounded-lg p-2 text-ink-300 hover:bg-rose-50 hover:text-rose-600">
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

      <p className="flex items-start gap-2 rounded-xl bg-ink-100/60 p-4 text-xs text-ink-600">
        <FiTruck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        Le seuil de livraison offerte se règle dans <strong className="mx-1">Paramètres</strong> : au-delà de ce montant,
        les frais passent automatiquement à zéro quelle que soit la zone.
      </p>
    </Panel>
  );
}

/* ============================== Codes promo ============================== */
export function Promotions() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => {
    adminApi.coupons().then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const blank = { code: '', type: 'percent', value: 10, minTotal: 0, maxUses: '', expiresAt: '', isActive: true };

  const save = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createCoupon(form);
      toast.success('Code promo créé');
      setForm(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const typeLabel = { percent: 'Pourcentage', fixed: 'Montant fixe', free_shipping: 'Livraison offerte' };

  return (
    <Panel
      title="Codes promo"
      description="Créez des réductions à communiquer sur WhatsApp ou les réseaux sociaux."
      onAdd={() => setForm({ ...blank })}
      addLabel="Nouveau code"
    >
      {form && (
        <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div>
            <label className="label">Code *</label>
            <input required className="input uppercase" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="RAMADAN25" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">Pourcentage</option>
              <option value="fixed">Montant fixe</option>
              <option value="free_shipping">Livraison offerte</option>
            </select>
          </div>
          <div>
            <label className="label">Valeur</label>
            <input type="number" min="0" className="input" value={form.value}
              disabled={form.type === 'free_shipping'}
              onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="label">Achat minimum</label>
            <input type="number" min="0" className="input" value={form.minTotal}
              onChange={(e) => setForm({ ...form, minTotal: e.target.value })} />
          </div>
          <div>
            <label className="label">Utilisations max</label>
            <input type="number" min="1" className="input" value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="illimité" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-gold btn-sm flex-1"><FiSave className="h-4 w-4" /> Créer</button>
            <button type="button" onClick={() => setForm(null)} className="btn-ghost btn-sm">Annuler</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={FiPercent} title="Aucun code promo" description="Créez un premier code pour lancer une opération commerciale." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Valeur</th>
                  <th className="px-4 py-3 font-semibold">Minimum</th>
                  <th className="px-4 py-3 font-semibold">Utilisations</th>
                  <th className="px-4 py-3 font-semibold">État</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((c) => (
                  <tr key={c.id} className="transition hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-bold tracking-wide">{c.code}</td>
                    <td className="px-4 py-3 text-ink-600">{typeLabel[c.type]}</td>
                    <td className="px-4 py-3">
                      {c.type === 'percent' ? `${c.value} %` : c.type === 'fixed' ? formatPrice(c.value) : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{c.min_total ? formatPrice(c.min_total) : '—'}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={async () => {
                          await adminApi.patchCoupon(c.id, { isActive: !c.is_active });
                          load();
                        }}
                        className={`chip ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'}`}
                      >
                        {c.is_active ? 'Actif' : 'Désactivé'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Supprimer le code « ${c.code} » ?`)) return;
                            await adminApi.deleteCoupon(c.id);
                            toast.success('Code supprimé');
                            load();
                          }}
                          className="rounded-lg p-2 text-ink-300 hover:bg-rose-50 hover:text-rose-600"
                        ><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ============================== Bannières ============================== */
export function Banners() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    adminApi.banners().then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const blank = { title: '', subtitle: '', ctaLabel: 'Découvrir', ctaLink: '/boutique', theme: 'gold', sortOrder: 0, isActive: true };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await adminApi.updateBanner(editing.id, editing);
      else await adminApi.createBanner(editing);
      toast.success('Bannière enregistrée');
      setEditing(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  return (
    <Panel
      title="Bannières d'accueil"
      description="Les grandes images du carrousel en haut de la page d'accueil."
      onAdd={() => setEditing({ ...blank })}
      addLabel="Nouvelle bannière"
    >
      {editing && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Titre *</label>
              <input required className="input" value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Sous-titre</label>
              <input className="input" value={editing.subtitle || ''}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="label">Texte du bouton</label>
              <input className="input" value={editing.ctaLabel || ''}
                onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} />
            </div>
            <div>
              <label className="label">Lien du bouton</label>
              <input className="input" value={editing.ctaLink || ''}
                onChange={(e) => setEditing({ ...editing, ctaLink: e.target.value })}
                placeholder="/categorie/mode-femme" />
            </div>
            <div>
              <label className="label">Ambiance</label>
              <select className="input" value={editing.theme}
                onChange={(e) => setEditing({ ...editing, theme: e.target.value })}>
                <option value="gold">Doré</option>
                <option value="dark">Noir</option>
              </select>
            </div>
            <div>
              <label className="label">Ordre</label>
              <input type="number" className="input" value={editing.sortOrder ?? 0}
                onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Image de fond (URL)</label>
            <input className="input" value={editing.image || ''}
              onChange={(e) => setEditing({ ...editing, image: e.target.value })}
              placeholder="/uploads/ma-banniere.webp" />
            <p className="mt-1 text-xs text-ink-400">
              Envoyez d'abord l'image depuis la fiche d'un produit, puis collez son adresse ici.
              Sans image, un dégradé aux couleurs de la marque est utilisé.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={!!editing.isActive}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
            Bannière affichée
          </label>

          <div className="flex gap-2">
            <button type="submit" className="btn-gold btn-sm"><FiSave className="h-4 w-4" /> Enregistrer</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost btn-sm">Annuler</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={FiImage} title="Aucune bannière" description="Ajoutez une bannière pour habiller la page d'accueil." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((b) => (
            <li key={b.id} className="card overflow-hidden">
              <div className={`relative flex h-32 items-end p-4 ${
                b.theme === 'dark'
                  ? 'bg-gradient-to-br from-ink-800 to-ink-950'
                  : 'bg-gradient-to-br from-gold-700 to-ink-950'
              }`}>
                <div>
                  <p className="font-display text-lg font-bold text-white">{b.title}</p>
                  {b.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{b.subtitle}</p>}
                </div>
                {!b.is_active && (
                  <span className="absolute right-3 top-3 chip bg-white/90 text-ink-800">Masquée</span>
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-ink-500">
                  {b.cta_label} → {b.cta_link}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing({
                      id: b.id, title: b.title, subtitle: b.subtitle, ctaLabel: b.cta_label,
                      ctaLink: b.cta_link, image: b.image, theme: b.theme,
                      sortOrder: b.sort_order, isActive: !!b.is_active,
                    })}
                    className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                  ><FiEdit2 className="h-4 w-4" /></button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Supprimer cette bannière ?')) return;
                      await adminApi.deleteBanner(b.id);
                      toast.success('Bannière supprimée');
                      load();
                    }}
                    className="rounded-lg p-2 text-ink-300 hover:bg-rose-50 hover:text-rose-600"
                  ><FiTrash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ============================== Clients ============================== */
export function Customers() {
  const toast = useToast();
  const [tab, setTab] = useState('comptes');
  const [accounts, setAccounts] = useState(null);
  const [guests, setGuests] = useState(null);

  useEffect(() => {
    adminApi.customers().then(setAccounts).catch((e) => toast.error(e.message));
    adminApi.guests().then(setGuests).catch(() => setGuests([]));
  }, [toast]);

  const rows = tab === 'comptes' ? accounts : guests;
  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  return (
    <Panel title="Clients" description="Comptes enregistrés et clientes ayant commandé sans créer de compte.">
      <div className="flex gap-1 border-b border-ink-200">
        {[
          { key: 'comptes', label: `Comptes (${accounts?.length || 0})` },
          { key: 'invites', label: `Sans compte (${guests?.length || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? 'border-gold-500 text-ink-950' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune cliente pour le moment" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Commandes</th>
                  <th className="px-4 py-3 text-right font-semibold">Total dépensé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((c, i) => (
                  <tr key={c.id || c.phone || i} className="transition hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-ink-400">
                        {tab === 'comptes'
                          ? `Inscrite le ${formatDate(c.created_at)}`
                          : `Dernière commande : ${formatDate(c.last_order)}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <p>{c.phone || '—'}</p>
                      {c.email && <p className="text-xs text-ink-400">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{c.orders}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPrice(c.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ============================== Avis ============================== */
export function Reviews() {
  const toast = useToast();
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    adminApi.reviews().then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (!rows) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const pending = rows.filter((r) => !r.is_approved);

  return (
    <Panel
      title="Avis clients"
      description={`${pending.length} avis en attente de validation. Un avis n'apparaît sur la boutique qu'après votre accord.`}
    >
      {rows.length === 0 ? (
        <EmptyState icon={FiTag} title="Aucun avis" description="Les avis déposés par vos clientes apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className={`card p-4 ${!r.is_approved ? 'border-amber-200 bg-amber-50/40' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.author}</p>
                  <p className="text-xs text-ink-500">
                    sur « {r.product_name} » · {formatDate(r.created_at)}
                  </p>
                  <p className="mt-1 text-gold-600">{'★'.repeat(r.rating)}<span className="text-ink-200">{'★'.repeat(5 - r.rating)}</span></p>
                  {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={async () => {
                      await adminApi.patchReview(r.id, { isApproved: !r.is_approved });
                      toast.success(r.is_approved ? 'Avis masqué' : 'Avis publié');
                      load();
                    }}
                    className={`btn-sm ${r.is_approved ? 'btn-outline' : 'btn-gold'}`}
                  >
                    {r.is_approved ? 'Masquer' : 'Publier'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Supprimer cet avis ?')) return;
                      await adminApi.deleteReview(r.id);
                      toast.success('Avis supprimé');
                      load();
                    }}
                    className="rounded-lg p-2 text-ink-300 hover:bg-rose-50 hover:text-rose-600"
                  ><FiTrash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
