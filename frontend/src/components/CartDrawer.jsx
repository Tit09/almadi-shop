import { Link } from 'react-router-dom';
import { FiX, FiTrash2, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../store/useCart';
import { useShop } from '../store/useShop';
import { mediaUrl } from '../lib/api';
import { formatPrice } from '../lib/format';
import PaymentLogos from './PaymentLogos';
import { EmptyState } from './ui';

export default function CartDrawer() {
  const { items, isOpen, close, remove, setQuantity } = useCart();
  const subtotal = useCart((s) => s.subtotal());
  const savings = useCart((s) => s.savings());
  const { settings } = useShop();

  if (!isOpen) return null;

  const freeFrom = settings?.freeShippingFrom || 0;
  const remaining = freeFrom > 0 ? Math.max(freeFrom - subtotal, 0) : 0;
  const progress = freeFrom > 0 ? Math.min((subtotal / freeFrom) * 100, 100) : 0;
  const enabled = Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={close} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-lift">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <FiShoppingBag className="h-5 w-5 text-gold-600" />
            Mon panier
            <span className="text-sm font-medium text-ink-400">({items.length})</span>
          </h2>
          <button onClick={close} className="rounded-lg p-2 transition hover:bg-ink-50" aria-label="Fermer le panier">
            <FiX className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center p-6">
            <EmptyState
              icon={FiShoppingBag}
              title="Votre panier est vide"
              description="Parcourez la boutique et ajoutez vos articles préférés."
              action={<Link to="/boutique" onClick={close} className="btn-gold">Découvrir la boutique</Link>}
            />
          </div>
        ) : (
          <>
            {freeFrom > 0 && (
              <div className="border-b border-ink-100 bg-gold-50/60 px-5 py-3">
                <p className="text-xs font-medium text-ink-700">
                  {remaining > 0 ? (
                    <>Plus que <strong className="text-gold-700">{formatPrice(remaining)}</strong> pour la livraison offerte</>
                  ) : (
                    <strong className="text-emerald-700">Livraison offerte sur cette commande</strong>
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gold-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <Link to={`/produit/${item.slug}`} onClick={close} className="shrink-0">
                      {item.image ? (
                        <img src={mediaUrl(item.image)} alt="" className="h-20 w-16 rounded-lg object-cover" />
                      ) : (
                        <span className="block h-20 w-16 rounded-lg bg-ink-100" />
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link to={`/produit/${item.slug}`} onClick={close} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-gold-600">
                        {item.name}
                      </Link>
                      {item.variant && <span className="mt-0.5 text-xs text-ink-500">{item.variant}</span>}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-lg border border-ink-200">
                          <button onClick={() => setQuantity(item.key, item.quantity - 1)} className="px-2.5 py-1.5 text-ink-600 transition hover:text-ink-950" aria-label="Diminuer">
                            <FiMinus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[28px] text-center text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= item.maxStock} className="px-2.5 py-1.5 text-ink-600 transition hover:text-ink-950 disabled:opacity-30" aria-label="Augmenter">
                            <FiPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>

                    <button onClick={() => remove(item.key)} className="self-start rounded-lg p-1.5 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Retirer">
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="space-y-3 border-t border-ink-100 p-5">
              {savings > 0 && (
                <p className="flex justify-between text-sm text-emerald-700">
                  <span>Économie réalisée</span>
                  <strong>−{formatPrice(savings)}</strong>
                </p>
              )}
              <p className="flex items-baseline justify-between">
                <span className="text-sm text-ink-600">Sous-total</span>
                <strong className="text-xl font-bold">{formatPrice(subtotal)}</strong>
              </p>
              <p className="text-xs text-ink-400">Frais de livraison calculés à l'étape suivante.</p>

              <Link to="/commande" onClick={close} className="btn-gold w-full">
                Passer la commande
              </Link>
              <Link to="/panier" onClick={close} className="btn-outline w-full">
                Voir le panier
              </Link>

              <div className="pt-1">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Paiement accepté</p>
                <PaymentLogos methods={enabled} size="sm" />
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
