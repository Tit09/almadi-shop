import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTrendingUp, FiShoppingCart, FiBox, FiUsers, FiAlertTriangle,
  FiArrowRight, FiCalendar, FiAward, FiDollarSign,
} from 'react-icons/fi';
import { adminApi, mediaUrl } from '../lib/api';
import { Spinner } from '../components/ui';
import { formatPrice, formatNumber, formatDate, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../lib/format';

/* ------------------------- Graphique 14 jours ------------------------- */
function RevenueChart({ data }) {
  if (!data?.length) {
    return <p className="py-12 text-center text-sm text-ink-400">Pas encore de données de vente.</p>;
  }
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-1.5">
        {data.map((d) => {
          const height = Math.max((d.revenue / max) * 100, 2);
          return (
            // h-full est requis : une hauteur en % sur la barre a besoin
            // d'un parent de hauteur connue pour être calculée.
            <div key={d.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lift transition group-hover:opacity-100">
                {formatPrice(d.revenue)}<br />
                <span className="font-normal text-ink-300">{d.orders} commande(s)</span>
              </span>
              <div
                className="w-full rounded-t bg-gold-400 transition-all duration-300 group-hover:bg-gold-600"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-400">
        <span>{formatDate(data[0].day)}</span>
        <span>{formatDate(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, sub, tone = 'ink', to }) => {
  const tones = {
    ink: 'bg-ink-950 text-gold-400',
    gold: 'bg-gold-500 text-ink-950',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
  };
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper {...(to ? { to } : {})} className="card flex items-start gap-4 p-5 transition hover:shadow-lift">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-1 truncate font-display text-xl font-bold text-ink-950">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
      </div>
    </Wrapper>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>;
  if (!stats) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const statuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Tableau de bord</h1>
          <p className="mt-1 text-sm text-ink-500">Vue d'ensemble de l'activité de la boutique.</p>
        </div>
        <Link to="/admin/produits/nouveau" className="btn-gold btn-sm">+ Ajouter un produit</Link>
      </header>

      {/* Indicateurs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FiDollarSign} label="Chiffre d'affaires" value={formatPrice(stats.revenue)}
          sub={`${formatPrice(stats.revenuePaid)} déjà encaissés`} tone="gold" />
        <Stat icon={FiCalendar} label="Aujourd'hui" value={formatPrice(stats.today.revenue)}
          sub={`${stats.today.orders} commande(s)`} tone="emerald" />
        <Stat icon={FiShoppingCart} label="Commandes du mois" value={formatNumber(stats.month.orders)}
          sub={formatPrice(stats.month.revenue)} to="/admin/commandes" />
        <Stat icon={FiAlertTriangle} label="Ruptures de stock" value={formatNumber(stats.counts.outOfStock)}
          sub="Produits à réapprovisionner" tone={stats.counts.outOfStock ? 'rose' : 'ink'} to="/admin/produits?low=1" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Graphique */}
        <div className="card p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <FiTrendingUp className="h-5 w-5 text-gold-600" /> Ventes des 14 derniers jours
            </h2>
          </div>
          <RevenueChart data={stats.chart} />
        </div>

        {/* Statuts */}
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Commandes par statut</h2>
          <ul className="space-y-2.5">
            {statuses.map((s) => {
              const n = stats.byStatus[s] || 0;
              const pct = stats.counts.orders ? Math.round((n / stats.counts.orders) * 100) : 0;
              return (
                <li key={s}>
                  <Link to={`/admin/commandes?status=${s}`} className="block rounded-lg p-2 transition hover:bg-ink-50">
                    <span className="flex items-center justify-between text-sm">
                      <span className={`chip ${ORDER_STATUS[s].tone}`}>{ORDER_STATUS[s].label}</span>
                      <span className="font-bold">{n}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <span className="block h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-center">
            <div>
              <p className="font-display text-xl font-bold">{formatNumber(stats.counts.products)}</p>
              <p className="text-xs text-ink-500">Produits</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold">{formatNumber(stats.counts.customers)}</p>
              <p className="text-xs text-ink-500">Comptes clients</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Top ventes */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
            <FiAward className="h-5 w-5 text-gold-600" /> Produits les plus vendus
          </h2>
          <ul className="space-y-3">
            {stats.topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  i === 0 ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600'
                }`}>{i + 1}</span>
                {p.image ? (
                  <img src={mediaUrl(p.image)} alt="" className="h-11 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="h-11 w-10 rounded-lg bg-ink-100" />
                )}
                <span className="min-w-0 flex-1">
                  <Link to={`/admin/produits/${p.id}`} className="block truncate text-sm font-medium hover:text-gold-700">{p.name}</Link>
                  <span className="text-xs text-ink-500">{p.qty} vendus · stock {p.stock}</span>
                </span>
                <span className="text-sm font-bold">{formatPrice(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stock faible */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
            <FiBox className="h-5 w-5 text-amber-600" /> Stock à surveiller
          </h2>
          {stats.lowStock.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">Tous les stocks sont au vert.</p>
          ) : (
            <ul className="space-y-3">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  {p.image ? (
                    <img src={mediaUrl(p.image)} alt="" className="h-11 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="h-11 w-10 rounded-lg bg-ink-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <Link to={`/admin/produits/${p.id}`} className="block truncate text-sm font-medium hover:text-gold-700">{p.name}</Link>
                    <span className="text-xs text-ink-500">{p.category?.name}</span>
                  </span>
                  <span className={`chip ${p.stock === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.stock === 0 ? 'Rupture' : `${p.stock} restant(s)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dernières commandes */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <FiUsers className="h-5 w-5 text-gold-600" /> Dernières commandes
          </h2>
          <Link to="/admin/commandes" className="flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800">
            Tout voir <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Commande</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Paiement</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
                <th className="px-5 py-3 text-right font-semibold">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="transition hover:bg-ink-50/60">
                  <td className="px-5 py-3">
                    <Link to={`/admin/commandes/${o.id}`} className="font-semibold text-ink-950 hover:text-gold-700">{o.order_number}</Link>
                    <p className="text-xs text-ink-400">{formatDate(o.created_at, true)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-ink-400">{o.phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium">{PAYMENT_METHODS[o.payment_method]}</p>
                    <span className={`chip mt-1 ${PAYMENT_STATUS[o.payment_status]?.tone}`}>
                      {PAYMENT_STATUS[o.payment_status]?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`chip ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
