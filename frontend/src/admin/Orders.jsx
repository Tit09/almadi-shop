import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiArrowLeft, FiPhone, FiMapPin, FiPrinter, FiSave, FiMessageSquare,
} from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { adminApi, mediaUrl } from '../lib/api';
import { Spinner, useToast, EmptyState } from '../components/ui';
import { useShop } from '../store/useShop';
import {
  formatPrice, formatDate, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, whatsappLink,
} from '../lib/format';

/* ============================== Liste ============================== */
export function Orders() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const status = params.get('status') || '';
  const payment = params.get('payment') || '';
  const q = params.get('q') || '';
  const page = params.get('page') || '1';

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .orders({ status, payment, q, page, limit: 20 })
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [status, payment, q, page, toast]);

  useEffect(() => { load(); }, [load]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-950">Commandes</h1>
        <p className="mt-1 text-sm text-ink-500">{data ? `${data.total} commande(s)` : 'Chargement…'}</p>
      </header>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Numéro de commande, nom ou téléphone…"
            defaultValue={q}
            onKeyDown={(e) => e.key === 'Enter' && update({ q: e.target.value })}
          />
        </div>

        <select value={status} onChange={(e) => update({ status: e.target.value })} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>

        <select value={payment} onChange={(e) => update({ payment: e.target.value })} className="input w-auto">
          <option value="">Tous les paiements</option>
          {Object.entries(PAYMENT_STATUS).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-gold-600" /></div>
      ) : !data?.items.length ? (
        <EmptyState title="Aucune commande" description="Aucune commande ne correspond à ces filtres." />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Commande</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Livraison</th>
                    <th className="px-4 py-3 font-semibold">Paiement</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.items.map((o) => (
                    <tr key={o.id} className="cursor-pointer transition hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/admin/commandes/${o.id}`} className="font-semibold text-ink-950 hover:text-gold-700">
                          {o.order_number}
                        </Link>
                        <p className="text-xs text-ink-400">{formatDate(o.created_at, true)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-xs text-ink-400">{o.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{o.zone_name}</p>
                        <p className="text-xs text-ink-400">{o.itemCount} article(s)</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium">{PAYMENT_METHODS[o.payment_method]}</p>
                        <span className={`chip mt-1 ${PAYMENT_STATUS[o.payment_status]?.tone}`}>
                          {PAYMENT_STATUS[o.payment_status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`chip ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{formatPrice(o.total)}</td>
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

/* ============================== Détail ============================== */
export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useShop();

  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    adminApi.order(id).then(setOrder).catch((e) => toast.error(e.message));
  }, [id, toast]);

  if (!order) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const apply = async (body, message) => {
    setSaving(true);
    try {
      setOrder(await adminApi.updateOrder(id, body));
      toast.success(message);
      setNote('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const waMessage =
    `Bonjour ${order.customer_name}, ici Almadi Shop. ` +
    `Votre commande ${order.order_number} (${formatPrice(order.total)}) est ` +
    `${ORDER_STATUS[order.status]?.label.toLowerCase()}. Merci de votre confiance !`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/admin/commandes')} className="mb-2 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-gold-700">
            <FiArrowLeft className="h-4 w-4" /> Retour aux commandes
          </button>
          <h1 className="font-display text-2xl font-bold text-ink-950">{order.order_number}</h1>
          <p className="mt-1 text-sm text-ink-500">Passée le {formatDate(order.created_at, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <a href={`tel:${order.phone}`} className="btn-outline btn-sm"><FiPhone className="h-3.5 w-3.5" /> Appeler</a>
          <a
            href={whatsappLink(order.phone, waMessage)}
            target="_blank" rel="noreferrer noopener"
            className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1eb855]"
          >
            <SiWhatsapp className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <button onClick={() => window.print()} className="btn-outline btn-sm"><FiPrinter className="h-3.5 w-3.5" /> Bon de livraison</button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Articles */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-ink-100 p-5 font-display text-lg font-bold">
              Articles ({order.items.length})
            </h2>
            <ul className="divide-y divide-ink-100">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 p-4">
                  {i.image ? (
                    <img src={mediaUrl(i.image)} alt="" className="h-16 w-14 rounded-lg object-cover" />
                  ) : (
                    <span className="h-16 w-14 rounded-lg bg-ink-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-ink-500">
                      {i.variant ? `${i.variant} · ` : ''}{formatPrice(i.unit_price)} × {i.quantity}
                    </p>
                  </div>
                  <span className="font-bold">{formatPrice(i.line_total)}</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-ink-100 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Remise {order.coupon_code && `(${order.coupon_code})`}</dt>
                  <dd>−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-ink-600">Livraison — {order.zone_name}</dt><dd>{order.delivery_fee ? formatPrice(order.delivery_fee) : 'Offerte'}</dd></div>
              <div className="flex items-baseline justify-between border-t border-ink-100 pt-2">
                <dt className="font-bold">Total</dt><dd className="text-xl font-bold">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Historique */}
          <section className="card p-5">
            <h2 className="mb-4 font-display text-lg font-bold">Historique</h2>
            <ul className="space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                  <span className="flex-1">
                    <span className="block text-ink-800">{e.message}</span>
                    <span className="block text-xs text-ink-400">
                      {formatDate(e.created_at, true)} · {e.author}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-ink-100 pt-4 no-print">
              <label className="label" htmlFor="od-note">Ajouter une note interne</label>
              <div className="flex gap-2">
                <input
                  id="od-note" className="input" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Cliente rappelée, livraison reportée à demain…"
                  onKeyDown={(e) => e.key === 'Enter' && note && apply({ note }, 'Note ajoutée')}
                />
                <button onClick={() => note && apply({ note }, 'Note ajoutée')} disabled={!note || saving} className="btn-outline shrink-0">
                  <FiMessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Actions */}
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-display text-lg font-bold">Statut de la commande</h2>
            <div className="space-y-2">
              {Object.entries(ORDER_STATUS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => apply({ status: key }, `Commande marquée « ${s.label} »`)}
                  disabled={saving || order.status === key}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    order.status === key
                      ? 'border-ink-950 bg-ink-950 text-white'
                      : 'border-ink-200 bg-white hover:border-ink-400'
                  }`}
                >
                  {s.label}
                  {order.status === key && <span className="text-xs">actuel</span>}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Annuler une commande remet automatiquement les articles en stock.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-display text-lg font-bold">Paiement</h2>
            <p className="mb-3 text-sm">
              Moyen : <strong>{PAYMENT_METHODS[order.payment_method]}</strong>
            </p>

            <label className="label" htmlFor="od-ref">Référence de transaction</label>
            <input
              id="od-ref" className="input mb-3" defaultValue={order.payment_ref || ''}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="ID Wave / Orange Money"
            />

            <div className="space-y-2">
              {Object.entries(PAYMENT_STATUS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => apply(
                    { paymentStatus: key, paymentRef: paymentRef || order.payment_ref },
                    `Paiement marqué « ${s.label} »`
                  )}
                  disabled={saving || order.payment_status === key}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    order.payment_status === key
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-ink-200 bg-white hover:border-ink-400'
                  }`}
                >
                  {s.label}
                  {order.payment_status === key && <FiSave className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <FiMapPin className="h-4 w-4 text-gold-600" /> Livraison
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-ink-950">{order.customer_name}</p>
              <p className="text-ink-600">{order.phone}</p>
              {order.email && <p className="text-ink-600">{order.email}</p>}
              <p className="pt-2 text-ink-700">{order.address}</p>
              {order.landmark && <p className="text-ink-500">Repère : {order.landmark}</p>}
              <p className="font-medium text-ink-800">{order.zone_name}</p>
              {order.note && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs italic text-amber-900">
                  Note cliente : « {order.note} »
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
