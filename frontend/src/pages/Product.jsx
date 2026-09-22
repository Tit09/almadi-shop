import { useContext } from 'react';
import { CurrencyContext } from '../App'; // (Ajustez le chemin avec un seul point "." si nécessaire selon votre dossier)

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FiChevronRight, FiShoppingBag, FiMinus, FiPlus, FiTruck, FiRefreshCw,
  FiShield, FiCheck, FiAlertTriangle, FiShare2,
} from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { api, mediaUrl } from '../lib/api';
import { useCart } from '../store/useCart';
import { useShop } from '../store/useShop';
import ProductCard from '../components/ProductCard';
import PaymentLogos from '../components/PaymentLogos';
import { Price, Rating, Badge, useToast, EmptyState, Spinner } from '../components/ui';
import { formatPrice, formatDate, whatsappLink, SEASONS } from '../lib/format';

export default function Product() {

  const { formatPrice } = useContext(CurrencyContext); // <-- À AJOUTER ICI
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const add = useCart((s) => s.add);
  const { settings } = useShop();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [picked, setPicked] = useState({});
  const [tab, setTab] = useState('description');
  const [reviewForm, setReviewForm] = useState({ author: '', rating: 5, comment: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    setQuantity(1);
    setPicked({});
    api
      .product(slug)
      .then((p) => {
        setProduct(p);
        // Présélection de la première valeur de chaque variante
        const initial = {};
        Object.entries(p.variants || {}).forEach(([kind, list]) => {
          if (list.length) initial[kind] = list[0].value;
        });
        setPicked(initial);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container-app grid gap-8 py-10 lg:grid-cols-2">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-5 w-1/3 rounded" />
          <div className="skeleton h-24 w-full rounded" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={FiAlertTriangle}
          title="Produit introuvable"
          description="Cet article n'existe plus ou a été retiré de la boutique."
          action={<Link to="/boutique" className="btn-gold">Retour à la boutique</Link>}
        />
      </div>
    );
  }

  const variantLabel = Object.entries(picked)
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} : ${v}`)
    .join(' · ');

  const out = !product.inStock;

  const handleAdd = () => {
    if (out) return;
    add(product, quantity, variantLabel || null);
    toast.success(`« ${product.name} » ajouté au panier`);
  };

  const buyNow = () => {
    if (out) return;
    add(product, quantity, variantLabel || null);
    navigate('/commande');
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); return; } catch { /* annulé */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papiers');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.review({ productId: product.id, ...reviewForm });
      toast.success(res.message);
      setReviewForm({ author: '', rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const images = product.images.length ? product.images : [null];
  const enabled = Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="container-app py-6 sm:py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
        <Link to="/" className="hover:text-gold-600">Accueil</Link>
        <FiChevronRight className="h-3 w-3" />
        <Link to="/boutique" className="hover:text-gold-600">Boutique</Link>
        {product.category && (
          <>
            <FiChevronRight className="h-3 w-3" />
            <Link to={`/categorie/${product.category.slug}`} className="hover:text-gold-600">{product.category.name}</Link>
          </>
        )}
        <FiChevronRight className="h-3 w-3" />
        <span className="truncate font-semibold text-ink-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Galerie */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
            <div className="aspect-square">
              {images[activeImage] ? (
                <img
                  src={mediaUrl(images[activeImage])}
                  alt={product.name}
                  className={`h-full w-full object-cover ${out ? 'grayscale' : ''}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-400">Photo à venir</div>
              )}
            </div>

            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.discount > 0 && <Badge tone="rose">−{product.discount} %</Badge>}
              {product.isNew && <Badge tone="gold">Nouveau</Badge>}
            </div>

            <button onClick={share} className="absolute right-4 top-4 rounded-full bg-white/90 p-2.5 text-ink-700 shadow-card transition hover:text-gold-600" aria-label="Partager">
              <FiShare2 className="h-4 w-4" />
            </button>

            {out && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="rounded-full bg-ink-950 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white">
                  Rupture de stock
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === i ? 'border-gold-500' : 'border-ink-100 hover:border-ink-300'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img src={mediaUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informations */}
        <div>
          {product.category && (
            <Link to={`/categorie/${product.category.slug}`} className="text-xs font-bold uppercase tracking-wider text-gold-600 hover:text-gold-700">
              {product.category.name}
            </Link>
          )}

          <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-ink-950 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Rating value={product.rating} count={product.ratingCount} size="md" />
            {product.soldCount > 0 && (
              <span className="text-xs text-ink-500">{product.soldCount} vendus</span>
            )}
            {product.sku && <span className="text-xs text-ink-400">Réf. {product.sku}</span>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Price value={formatPrice(product.price)} compare={formatPrice(product.comparePrice)} size="xl" />
            {product.discount > 0 && (
              <Badge tone="rose">Économisez {formatPrice(product.comparePrice - product.price)}</Badge>
            )}
          </div>

          {product.shortDesc && (
            <p className="mt-4 text-sm leading-relaxed text-ink-600">{product.shortDesc}</p>
          )}

          {/* État du stock */}
          <div className="mt-5">
            {out ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                <FiAlertTriangle className="h-4 w-4" /> Article en rupture — réapprovisionnement en cours
              </p>
            ) : product.stockState === 'low' ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                <FiAlertTriangle className="h-4 w-4" /> Plus que {product.stock} en stock, commandez vite
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <FiCheck className="h-4 w-4" /> En stock, expédié sous 24 h
              </p>
            )}
          </div>

          {/* Variantes */}
          {Object.entries(product.variants || {}).map(([kind, list]) => (
            <div key={kind} className="mt-6">
              <p className="label">{kind}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setPicked((p) => ({ ...p, [kind]: v.value }))}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      picked[kind] === v.value
                        ? 'border-ink-950 bg-ink-950 text-white'
                        : 'border-ink-200 bg-white text-ink-700 hover:border-ink-950'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantité + achat */}
          {!out && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-ink-200">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-4 py-3 text-ink-600 hover:text-ink-950" aria-label="Diminuer">
                  <FiMinus className="h-4 w-4" />
                </button>
                <span className="min-w-[40px] text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.trackStock ? product.stock : 99, q + 1))}
                  className="px-4 py-3 text-ink-600 hover:text-ink-950 disabled:opacity-30"
                  disabled={product.trackStock && quantity >= product.stock}
                  aria-label="Augmenter"
                >
                  <FiPlus className="h-4 w-4" />
                </button>
              </div>

              <button onClick={handleAdd} className="btn-primary flex-1 sm:flex-none sm:px-8">
                <FiShoppingBag className="h-4 w-4" /> Ajouter au panier
              </button>
              <button onClick={buyNow} className="btn-gold flex-1 sm:flex-none sm:px-8">
                Commander maintenant
              </button>
            </div>
          )}

          {settings?.whatsapp && (
            <a
              href={whatsappLink(
                settings.whatsapp,
                `Bonjour Almadi Shop, je suis intéressée par « ${product.name} » (${formatPrice(product.price)}). Est-il disponible ?`
              )}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] px-5 py-3 text-sm font-semibold text-[#128C7E] transition hover:bg-[#25D366]/10 sm:w-auto sm:px-8"
            >
              <SiWhatsapp className="h-4 w-4" /> Commander par WhatsApp
            </a>
          )}

          {/* Réassurance */}
          <ul className="mt-7 space-y-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-5 text-sm">
            <li className="flex gap-3">
              <FiTruck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span><strong>Livraison à Conakry sous 24 h.</strong> Frais calculés selon votre commune au moment de la commande.</span>
            </li>
            <li className="flex gap-3">
              <FiRefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span><strong>Échange sous 48 h</strong> si l'article n'a pas été porté et garde son étiquette.</span>
            </li>
            <li className="flex gap-3">
              <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
              <span><strong>Paiement au choix</strong> — mobile, carte, ou en espèces à la réception.</span>
            </li>
          </ul>

          <div className="mt-5">
            <PaymentLogos methods={enabled} size="sm" />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="mt-14">
        <div className="flex gap-1 border-b border-ink-100">
          {[
            { key: 'description', label: 'Description' },
            { key: 'livraison', label: 'Livraison & retours' },
            { key: 'avis', label: `Avis (${product.reviews?.length || 0})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-gold-500 text-ink-950' : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-7">
          {tab === 'description' && (
            <div className="max-w-3xl">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {product.description || product.shortDesc || 'Description à venir.'}
              </p>
              <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {product.brand && (
                  <div className="flex justify-between border-b border-ink-100 py-2">
                    <dt className="text-ink-500">Marque</dt><dd className="font-semibold">{product.brand}</dd>
                  </div>
                )}
                {product.season && (
                  <div className="flex justify-between border-b border-ink-100 py-2">
                    <dt className="text-ink-500">Saison</dt>
                    <dd className="font-semibold">{SEASONS[product.season]?.label || product.season}</dd>
                  </div>
                )}
                {product.sku && (
                  <div className="flex justify-between border-b border-ink-100 py-2">
                    <dt className="text-ink-500">Référence</dt><dd className="font-semibold">{product.sku}</dd>
                  </div>
                )}
                {product.tags.length > 0 && (
                  <div className="flex justify-between border-b border-ink-100 py-2">
                    <dt className="text-ink-500">Mots-clés</dt><dd className="font-semibold">{product.tags.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {tab === 'livraison' && (
            <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-ink-700">
              <p><strong>Conakry :</strong> livraison le jour même ou sous 24 h selon la commune (Kaloum, Dixinn, Matam, Ratoma, Matoto). Frais de 20 000 à 25 000 GNF.</p>
              <p><strong>Périphérie et intérieur :</strong> Coyah et Dubréka sous 24–48 h ; Kindia, Boké, Labé, Kankan et N'Zérékoré sous 2 à 5 jours via les compagnies de transport partenaires.</p>
              <p><strong>Livraison offerte</strong> à partir de {formatPrice(settings?.freeShippingFrom || 1500000)} d'achat.</p>
              <p><strong>Échange :</strong> sous 48 h après réception, article non porté, étiquette d'origine présente. Les articles soldés et les sous-vêtements ne sont pas repris.</p>
              <p>Une question ? Appelez-nous au <strong>{settings?.phone || '+224 625 00 33 39'}</strong>.</p>
            </div>
          )}

          {tab === 'avis' && (
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <div>
                {product.reviews?.length ? (
                  <ul className="space-y-5">
                    {product.reviews.map((r) => (
                      <li key={r.id} className="border-b border-ink-100 pb-5 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-ink-950">{r.author}</p>
                          <span className="text-xs text-ink-400">{formatDate(r.created_at)}</span>
                        </div>
                        <Rating value={r.rating} showCount={false} />
                        {r.comment && <p className="mt-2 text-sm leading-relaxed text-ink-600">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-500">Aucun avis publié pour le moment. Soyez la première à donner le vôtre.</p>
                )}
              </div>

              <form onSubmit={submitReview} className="card h-fit space-y-4 p-5">
                <h3 className="font-display text-lg font-bold">Donner mon avis</h3>
                <div>
                  <label className="label" htmlFor="rv-name">Votre nom</label>
                  <input id="rv-name" required maxLength={60} className="input"
                    value={reviewForm.author}
                    onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })} />
                </div>
                <div>
                  <span className="label">Votre note</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                        className={`text-2xl transition ${n <= reviewForm.rating ? 'text-gold-500' : 'text-ink-200'}`}
                        aria-label={`${n} étoile${n > 1 ? 's' : ''}`}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="rv-comment">Votre commentaire</label>
                  <textarea id="rv-comment" rows={4} maxLength={800} className="input resize-none"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                </div>
                <button type="submit" disabled={sending} className="btn-primary w-full">
                  {sending ? <Spinner className="h-4 w-4" /> : 'Publier mon avis'}
                </button>
                <p className="text-xs text-ink-400">Votre avis sera visible après vérification par la boutique.</p>
              </form>
            </div>
          )}
        </div>
      </div>

      {product.related?.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-6">Vous aimerez aussi</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {product.related.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
