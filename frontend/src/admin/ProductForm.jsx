import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiSave, FiPlus, FiTrash2, FiImage } from 'react-icons/fi';
import { adminApi, mediaUrl } from '../lib/api';
import { Spinner, useToast } from '../components/ui';
import { SEASONS, formatPrice } from '../lib/format';

const EMPTY = {
  name: '', slug: '', sku: '', shortDesc: '', description: '',
  price: '', comparePrice: '', costPrice: '',
  stock: '0', lowStock: '3', trackStock: true,
  categoryId: '', season: '', brand: 'Almadi', tags: '',
  status: 'active', isFeatured: false, isNew: true,
  images: [], variants: { taille: [], couleur: [] },
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'nouveau';
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newVariant, setNewVariant] = useState({ taille: '', couleur: '' });

  useEffect(() => {
    adminApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    adminApi
      .product(id)
      .then((p) => {
        setForm({
          name: p.name || '', slug: p.slug || '', sku: p.sku || '',
          shortDesc: p.shortDesc || '', description: p.description || '',
          price: String(p.price ?? ''), comparePrice: p.comparePrice ? String(p.comparePrice) : '',
          costPrice: '', stock: String(p.stock ?? 0), lowStock: String(p.lowStock ?? 3),
          trackStock: p.trackStock, categoryId: p.category?.id ? String(p.category.id) : '',
          season: p.season || '', brand: p.brand || '', tags: (p.tags || []).join(', '),
          status: p.status, isFeatured: p.isFeatured, isNew: p.isNew,
          images: p.images || [],
          variants: {
            taille: (p.variants?.taille || []).map((v) => ({ value: v.value, stock: v.stock })),
            couleur: (p.variants?.couleur || []).map((v) => ({ value: v.value, stock: v.stock })),
          },
        });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew, toast]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const { urls } = await adminApi.upload(files);
      setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 8) }));
      toast.success(`${urls.length} image(s) ajoutée(s)`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addVariant = (kind) => {
    const value = newVariant[kind].trim();
    if (!value) return;
    setForm((f) => ({
      ...f,
      variants: { ...f.variants, [kind]: [...f.variants[kind], { value, stock: 0 }] },
    }));
    setNewVariant((v) => ({ ...v, [kind]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Le nom du produit est obligatoire.');
    if (!form.price) return toast.error('Indiquez un prix de vente.');

    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      stock: Number(form.stock),
      lowStock: Number(form.lowStock),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      const saved = isNew
        ? await adminApi.createProduct(payload)
        : await adminApi.updateProduct(id, payload);
      toast.success(isNew ? 'Produit créé' : 'Modifications enregistrées');
      navigate(`/admin/produits/${saved.id}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const margin =
    form.costPrice && form.price
      ? Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)
      : null;

  return (
    <form onSubmit={submit} className="space-y-6 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/produits" className="mb-2 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-gold-700">
            <FiArrowLeft className="h-4 w-4" /> Retour aux produits
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink-950">
            {isNew ? 'Nouveau produit' : form.name || 'Modifier le produit'}
          </h1>
        </div>
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? <Spinner className="h-4 w-4" /> : <FiSave className="h-4 w-4" />}
          {isNew ? 'Créer le produit' : 'Enregistrer'}
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Informations */}
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Informations</h2>

            <div>
              <label className="label" htmlFor="pf-name">Nom du produit *</label>
              <input id="pf-name" required className="input" value={form.name} onChange={set('name')}
                placeholder="Robe longue fluide — coton imprimé" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="pf-sku">Référence (SKU)</label>
                <input id="pf-sku" className="input" value={form.sku} onChange={set('sku')} placeholder="ALM-1042" />
              </div>
              <div>
                <label className="label" htmlFor="pf-brand">Marque</label>
                <input id="pf-brand" className="input" value={form.brand} onChange={set('brand')} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="pf-short">Accroche courte</label>
              <input id="pf-short" className="input" maxLength={200} value={form.shortDesc} onChange={set('shortDesc')}
                placeholder="Phrase affichée sous le titre sur la fiche produit" />
            </div>

            <div>
              <label className="label" htmlFor="pf-desc">Description complète</label>
              <textarea id="pf-desc" rows={8} className="input resize-y" value={form.description} onChange={set('description')}
                placeholder="Matière, coupe, entretien, conseils de taille…" />
            </div>

            <div>
              <label className="label" htmlFor="pf-tags">Mots-clés (séparés par des virgules)</label>
              <input id="pf-tags" className="input" value={form.tags} onChange={set('tags')}
                placeholder="robe, été, coton, longue" />
              <p className="mt-1 text-xs text-ink-400">Les mots-clés améliorent les résultats de la recherche interne.</p>
            </div>
          </section>

          {/* Images */}
          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Photos</h2>
              <span className="text-xs text-ink-400">{form.images.length}/8</span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.images.map((url, i) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-ink-100">
                  <img src={mediaUrl(url)} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Principale
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }))}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-rose-600 opacity-0 transition group-hover:opacity-100"
                    aria-label="Retirer la photo"
                  >
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {form.images.length < 8 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 text-ink-400 transition hover:border-gold-400 hover:text-gold-600"
                >
                  {uploading ? <Spinner className="h-5 w-5" /> : <FiUpload className="h-5 w-5" />}
                  <span className="text-xs font-medium">Ajouter</span>
                </button>
              )}
            </div>

            <input
              ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              onChange={(e) => upload(e.target.files)}
            />
            <p className="flex items-start gap-2 text-xs text-ink-400">
              <FiImage className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              JPG, PNG ou WEBP, 6 Mo maximum. Les images sont automatiquement redimensionnées et converties en WebP
              pour rester rapides à charger en 3G.
            </p>
          </section>

          {/* Variantes */}
          <section className="card space-y-5 p-5">
            <h2 className="font-display text-lg font-bold">Tailles & couleurs</h2>

            {['taille', 'couleur'].map((kind) => (
              <div key={kind}>
                <p className="label">{kind === 'taille' ? 'Tailles disponibles' : 'Couleurs disponibles'}</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {form.variants[kind].map((v, i) => (
                    <span key={i} className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm">
                      {v.value}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          variants: { ...f.variants, [kind]: f.variants[kind].filter((_, n) => n !== i) },
                        }))}
                        className="text-ink-300 transition hover:text-rose-600"
                        aria-label="Retirer"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {form.variants[kind].length === 0 && (
                    <span className="text-xs text-ink-400">Aucune {kind} définie.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder={kind === 'taille' ? 'S, M, L, XL, 38 cm…' : 'Noir, Beige, Bordeaux…'}
                    value={newVariant[kind]}
                    onChange={(e) => setNewVariant((v) => ({ ...v, [kind]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVariant(kind); } }}
                  />
                  <button type="button" onClick={() => addVariant(kind)} className="btn-outline shrink-0">
                    <FiPlus className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Prix</h2>

            <div>
              <label className="label" htmlFor="pf-price">Prix de vente (GNF) *</label>
              <input id="pf-price" type="number" min="0" required className="input" value={form.price} onChange={set('price')} />
              {form.price && <p className="mt-1 text-xs text-ink-500">{formatPrice(form.price)}</p>}
            </div>

            <div>
              <label className="label" htmlFor="pf-compare">Prix barré (promotion)</label>
              <input id="pf-compare" type="number" min="0" className="input" value={form.comparePrice} onChange={set('comparePrice')} />
              <p className="mt-1 text-xs text-ink-400">Laissez vide s'il n'y a pas de promotion.</p>
            </div>

            <div>
              <label className="label" htmlFor="pf-cost">Prix d'achat (privé)</label>
              <input id="pf-cost" type="number" min="0" className="input" value={form.costPrice} onChange={set('costPrice')} />
              {margin !== null && (
                <p className={`mt-1 text-xs font-semibold ${margin > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Marge : {margin} %
                </p>
              )}
              <p className="mt-1 text-xs text-ink-400">Jamais visible par les clientes.</p>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Stock</h2>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={form.trackStock} onChange={set('trackStock')}
                className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
              Suivre le stock de ce produit
            </label>

            {form.trackStock && (
              <>
                <div>
                  <label className="label" htmlFor="pf-stock">Quantité disponible</label>
                  <input id="pf-stock" type="number" min="0" className="input" value={form.stock} onChange={set('stock')} />
                  {Number(form.stock) === 0 && (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      À 0, le produit s'affiche « Rupture de stock » et ne peut plus être commandé.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="pf-low">Seuil d'alerte</label>
                  <input id="pf-low" type="number" min="0" className="input" value={form.lowStock} onChange={set('lowStock')} />
                  <p className="mt-1 text-xs text-ink-400">En dessous, le produit remonte dans « Stock à surveiller ».</p>
                </div>
              </>
            )}
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Classement</h2>

            <div>
              <label className="label" htmlFor="pf-cat">Catégorie</label>
              <select id="pf-cat" className="input" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? '— ' : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="pf-season">Saison</label>
              <select id="pf-season" className="input" value={form.season} onChange={set('season')}>
                <option value="">Non précisée</option>
                {Object.entries(SEASONS).map(([k, s]) => (
                  <option key={k} value={k}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="pf-status">Statut</label>
              <select id="pf-status" className="input" value={form.status} onChange={set('status')}>
                <option value="active">En ligne (visible)</option>
                <option value="draft">Brouillon (caché)</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            <div className="space-y-2.5 border-t border-ink-100 pt-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')}
                  className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
                Coup de cœur (mis en avant sur l'accueil)
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={form.isNew} onChange={set('isNew')}
                  className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
                Afficher le badge « Nouveau »
              </label>
            </div>
          </section>

          {!isNew && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Supprimer définitivement ce produit ?')) return;
                try {
                  await adminApi.deleteProduct(id);
                  toast.success('Produit supprimé');
                  navigate('/admin/produits');
                } catch (e) { toast.error(e.message); }
              }}
              className="btn w-full border border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <FiTrash2 className="h-4 w-4" /> Supprimer ce produit
            </button>
          )}
        </aside>
      </div>

      {/* Barre d'enregistrement fixe */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 p-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end gap-3">
          <Link to="/admin/produits" className="btn-ghost btn-sm">Annuler</Link>
          <button type="submit" disabled={saving} className="btn-gold btn-sm">
            {saving ? <Spinner className="h-4 w-4" /> : <FiSave className="h-4 w-4" />}
            {isNew ? 'Créer le produit' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </form>
  );
}
