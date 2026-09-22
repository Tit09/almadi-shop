import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiLogOut, FiPackage, FiShield, FiGrid } from 'react-icons/fi';
import { api } from '../lib/api';
import { useAuth } from '../store/useAuth';
import { Spinner, useToast, EmptyState } from '../components/ui';
import { formatPrice, formatDate, ORDER_STATUS, PAYMENT_METHODS } from '../lib/format';

/* ------------------------- Connexion / inscription ------------------------- */
export function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { login, register } = useAuth();

  const [mode, setMode] = useState(params.get('mode') === 'inscription' ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success(`Bienvenue ${user.name.split(' ')[0]} !`);
      navigate(user.role === 'admin' ? '/admin' : '/compte');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-app max-w-md py-12 sm:py-20">
      <div className="card p-6 sm:p-8">
        <img src="/logo-almadi.png" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-center font-display text-2xl font-bold">
          {mode === 'login' ? 'Connexion' : 'Créer mon compte'}
        </h1>
        <p className="mt-1.5 text-center text-sm text-ink-500">
          {mode === 'login'
            ? 'Retrouvez vos commandes et vos informations.'
            : 'Suivez vos commandes et commandez plus vite la prochaine fois.'}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="label" htmlFor="ac-name">Nom complet</label>
                <input id="ac-name" required className="input" value={form.name} onChange={set('name')} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="ac-phone">Téléphone</label>
                <input id="ac-phone" className="input" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="625 00 33 39" />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="ac-email">Adresse e-mail</label>
            <input id="ac-email" type="email" required className="input" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="ac-pass">Mot de passe</label>
            <input
              id="ac-pass" type="password" required minLength={8} className="input"
              value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && <p className="mt-1 text-xs text-ink-400">8 caractères minimum.</p>}
          </div>

          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? <Spinner className="h-4 w-4" /> : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          {mode === 'login' ? (
            <>Pas encore de compte ?{' '}
              <button onClick={() => setMode('register')} className="font-semibold text-gold-700 underline">Créer un compte</button>
            </>
          ) : (
            <>Déjà cliente ?{' '}
              <button onClick={() => setMode('login')} className="font-semibold text-gold-700 underline">Se connecter</button>
            </>
          )}
        </p>

        <p className="mt-4 border-t border-ink-100 pt-4 text-center text-xs text-ink-400">
          Vous pouvez aussi commander sans compte et{' '}
          <Link to="/suivi" className="underline">suivre votre commande</Link> avec son numéro.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Espace client ------------------------------ */
export default function Account() {
  const { user, ready, logout } = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (user) api.myOrders().then(setOrders).catch(() => setOrders([]));
  }, [user]);

  if (!ready) {
    return <div className="container-app flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;
  }

  if (!user) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={FiUser}
          title="Vous n'êtes pas connectée"
          description="Connectez-vous pour retrouver vos commandes, ou suivez une commande avec son numéro."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/connexion" className="btn-gold">Se connecter</Link>
              <Link to="/suivi" className="btn-outline">Suivre une commande</Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app max-w-4xl py-10 sm:py-14">
      <div className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-xl font-bold text-gold-700">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-ink-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' && (
            <Link to="/admin" className="btn-primary btn-sm"><FiGrid className="h-3.5 w-3.5" /> Panel admin</Link>
          )}
          <button onClick={logout} className="btn-outline btn-sm"><FiLogOut className="h-3.5 w-3.5" /> Déconnexion</button>
        </div>
      </div>

      <h2 className="mb-4 mt-10 flex items-center gap-2 font-display text-xl font-bold">
        <FiPackage className="h-5 w-5 text-gold-600" /> Mes commandes
      </h2>

      {orders === null ? (
        <div className="flex justify-center py-12"><Spinner className="h-6 w-6 text-gold-600" /></div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={FiPackage}
          title="Aucune commande pour l'instant"
          description="Vos futures commandes apparaîtront ici."
          action={<Link to="/boutique" className="btn-gold">Découvrir la boutique</Link>}
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.orderNumber} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-ink-500">{formatDate(o.createdAt, true)} · {PAYMENT_METHODS[o.paymentMethod]}</p>
                </div>
                <span className={`chip ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label}</span>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                {o.items.slice(0, 3).map((i, n) => (
                  <li key={n} className="truncate">× {i.quantity} — {i.name}</li>
                ))}
                {o.items.length > 3 && <li className="text-xs text-ink-400">et {o.items.length - 3} autre(s) article(s)</li>}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-lg font-bold">{formatPrice(o.total)}</span>
                <Link to={`/suivi?number=${o.orderNumber}&phone=${encodeURIComponent(o.phone)}`} className="btn-outline btn-sm">
                  Suivre
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 flex items-start gap-2 rounded-xl bg-ink-50 p-4 text-xs leading-relaxed text-ink-500">
        <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        Vos informations personnelles ne sont utilisées que pour traiter vos commandes et ne sont jamais revendues.
      </p>
    </div>
  );
}
