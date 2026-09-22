import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiPackage, FiCheck, FiTruck, FiClipboard, FiXCircle, FiHome } from 'react-icons/fi';
import { api, mediaUrl } from '../lib/api';
import { Spinner, useToast } from '../components/ui';
import { formatPrice, formatDate, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../lib/format';

const TIMELINE = [
  { key: 'pending', label: 'Commande reçue', Icon: FiClipboard },
  { key: 'confirmed', label: 'Confirmée', Icon: FiCheck },
  { key: 'packed', label: 'Colis préparé', Icon: FiPackage },
  { key: 'shipped', label: 'En livraison', Icon: FiTruck },
  { key: 'delivered', label: 'Livrée', Icon: FiHome },
];

export default function Track() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [form, setForm] = useState({
    number: params.get('number') || '',
    phone: params.get('phone') || '',
  });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOrder(null);
    try {
      setOrder(await api.trackOrder(form.number.trim(), form.phone.trim()));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? ORDER_STATUS[order.status]?.step ?? 0 : 0;
  const cancelled = order?.status === 'cancelled';

  return (
    <div className="container-app max-w-3xl py-10 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="section-title">Suivre ma commande</h1>
        <p className="mt-2 text-sm text-ink-500">
          Saisissez votre numéro de commande et le téléphone utilisé lors de l'achat.
        </p>
      </header>

      <form onSubmit={search} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <div>
          <label className="label" htmlFor="tr-number">Numéro de commande</label>
          <input
            id="tr-number" required className="input uppercase" placeholder="ALM-260922-4F7K"
            value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="tr-phone">Téléphone</label>
          <input
            id="tr-phone" required className="input" placeholder="625 00 33 39" inputMode="tel"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-gold h-[46px]">
          {loading ? <Spinner className="h-4 w-4" /> : <FiSearch className="h-4 w-4" />}
          Rechercher
        </button>
      </form>

      {order && (
        <div className="card mt-8 overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">Commande</p>
              <p className="font-display text-lg font-bold">{order.orderNumber}</p>
              <p className="mt-0.5 text-xs text-ink-500">Passée le {formatDate(order.createdAt, true)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`chip ${ORDER_STATUS[order.status]?.tone}`}>{ORDER_STATUS[order.status]?.label}</span>
              <span className={`chip ${PAYMENT_STATUS[order.paymentStatus]?.tone}`}>
                Paiement : {PAYMENT_STATUS[order.paymentStatus]?.label}
              </span>
            </div>
          </header>

          {/* Progression */}
          <div className="border-b border-ink-100 p-5 sm:p-6">
            {cancelled ? (
              <p className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">
                <FiXCircle className="h-5 w-5" /> Cette commande a été annulée. Contactez-nous pour toute question.
              </p>
            ) : (
              <ol className="flex">
                {TIMELINE.map((step, i) => {
                  const done = i <= currentStep;
                  const Icon = step.Icon;
                  return (
                    <li key={step.key} className="flex flex-1 flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : done ? 'bg-emerald-500' : 'bg-ink-100'}`} />
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                          done ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-400'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={`h-0.5 flex-1 ${i === TIMELINE.length - 1 ? 'bg-transparent' : i < currentStep ? 'bg-emerald-500' : 'bg-ink-100'}`} />
                      </div>
                      <span className={`mt-2 text-[11px] font-semibold leading-tight sm:text-xs ${done ? 'text-ink-950' : 'text-ink-400'}`}>
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Articles */}
          <div className="border-b border-ink-100 p-5 sm:p-6">
            <h2 className="label">Articles commandés</h2>
            <ul className="divide-y divide-ink-100">
              {order.items.map((i, n) => (
                <li key={n} className="flex items-center gap-3 py-3">
                  {i.image ? (
                    <img src={mediaUrl(i.image)} alt="" className="h-14 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="h-14 w-12 rounded-lg bg-ink-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.name}</span>
                    <span className="block text-xs text-ink-500">
                      {i.variant ? `${i.variant} · ` : ''}× {i.quantity}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{formatPrice(i.line_total)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>Remise</dt><dd>−{formatPrice(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-600">Livraison — {order.zoneName}</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</dd></div>
              <div className="flex items-baseline justify-between border-t border-ink-100 pt-2">
                <dt className="font-bold">Total</dt><dd className="text-lg font-bold">{formatPrice(order.total)}</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-ink-600">Moyen de paiement</dt>
                <dd className="font-semibold">{PAYMENT_METHODS[order.paymentMethod]}</dd>
              </div>
            </dl>
          </div>

          {/* Historique */}
          <div className="p-5 sm:p-6">
            <h2 className="label">Historique</h2>
            <ul className="space-y-3">
              {order.events.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                  <span className="flex-1">
                    <span className="block text-ink-800">{e.message}</span>
                    <span className="block text-xs text-ink-400">{formatDate(e.created_at, true)}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl bg-ink-50 p-4 text-sm">
              <p className="font-semibold text-ink-950">Adresse de livraison</p>
              <p className="mt-1 text-ink-600">{order.customerName} · {order.phone}</p>
              <p className="text-ink-600">{order.address} — {order.zoneName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
