import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiTag, FiArrowRight, FiX } from 'react-icons/fi';
import { useCart } from '../store/useCart';
import { useShop } from '../store/useShop';
import { api, mediaUrl } from '../lib/api';
import { formatPrice } from '../lib/format';
import PaymentLogos from '../components/PaymentLogos';
import { EmptyState, useToast, Spinner } from '../components/ui';

export default function Cart() {
  const { items, remove, setQuantity } = useCart();
  const subtotal = useCart((s) => s.subtotal());
  const savings = useCart((s) => s.savings());
  const { settings } = useShop();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [checking, setChecking] = useState(false);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await api.validateCoupon(code.trim(), subtotal);
      setCoupon(res);
      toast.success(
        res.freeShipping ? 'Code appliqué : livraison offerte' : `Code appliqué : −${formatPrice(res.discount)}`
      );
    } catch (err) {
      toast.error(err.message);
      setCoupon(null);
    } finally {
      setChecking(false);
    }
  };

  if (!items.length) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={FiShoppingBag}
          title="Votre panier est vide"
          description="Ajoutez des articles depuis la boutique pour commencer votre commande."
          action={<Link to="/boutique" className="btn-gold">Parcourir la boutique</Link>}
        />
      </div>
    );
  }

  const discount = coupon && !coupon.freeShipping ? coupon.discount : 0;
  const total = Math.max(subtotal - discount, 0);
  const enabled = Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="container-app py-8 sm:py-12">
      <h1 className="section-title mb-8">Mon panier</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Articles */}
        <div className="card divide-y divide-ink-100">
          {items.map((item) => (
            <div key={item.key} className="flex gap-4 p-4 sm:p-5">
              <Link to={`/produit/${item.slug}`} className="shrink-0">
                {item.image ? (
                  <img src={mediaUrl(item.image)} alt="" className="h-28 w-24 rounded-xl object-cover" />
                ) : (
                  <span className="block h-28 w-24 rounded-xl bg-ink-100" />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/produit/${item.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-gold-600">
                      {item.name}
                    </Link>
                    {item.variant && <p className="mt-1 text-xs text-ink-500">{item.variant}</p>}
                    <p className="mt-1 text-sm text-ink-500">{formatPrice(item.price)} l'unité</p>
                  </div>
                  <button onClick={() => remove(item.key)} className="rounded-lg p-2 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Retirer l'article">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-ink-200">
                    <button onClick={() => setQuantity(item.key, item.quantity - 1)} className="px-3 py-2 text-ink-600 hover:text-ink-950" aria-label="Diminuer">
                      <FiMinus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= item.maxStock} className="px-3 py-2 text-ink-600 hover:text-ink-950 disabled:opacity-30" aria-label="Augmenter">
                      <FiPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-lg font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <aside className="h-fit space-y-4 lg:sticky lg:top-28">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Récapitulatif</h2>

            <form onSubmit={applyCoupon} className="mt-4">
              <label className="label" htmlFor="coupon">Code promo</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiTag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="coupon"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BIENVENUE10"
                    className="input pl-9 uppercase"
                  />
                </div>
                <button type="submit" disabled={checking} className="btn-outline shrink-0">
                  {checking ? <Spinner className="h-4 w-4" /> : 'Appliquer'}
                </button>
              </div>
            </form>

            {coupon && (
              <p className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <span>Code « {coupon.code} » actif</span>
                <button onClick={() => { setCoupon(null); setCode(''); }} aria-label="Retirer le code">
                  <FiX className="h-3.5 w-3.5" />
                </button>
              </p>
            )}

            <dl className="mt-5 space-y-2.5 border-t border-ink-100 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Sous-total</dt>
                <dd className="font-semibold">{formatPrice(subtotal)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Remises produits</dt>
                  <dd className="font-semibold">−{formatPrice(savings)}</dd>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Code promo</dt>
                  <dd className="font-semibold">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">Livraison</dt>
                <dd className="text-xs text-ink-500">
                  {coupon?.freeShipping ? 'Offerte' : 'Calculée à l’étape suivante'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                <dt className="font-semibold">Total estimé</dt>
                <dd className="text-xl font-bold">{formatPrice(total)}</dd>
              </div>
            </dl>

            <Link
              to="/commande"
              state={coupon ? { couponCode: coupon.code } : undefined}
              className="btn-gold mt-5 w-full"
            >
              Passer la commande <FiArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/boutique" className="btn-ghost mt-2 w-full">Continuer mes achats</Link>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Paiement accepté</p>
            <PaymentLogos methods={enabled} size="sm" />
          </div>
        </aside>
      </div>
    </div>
  );
}
