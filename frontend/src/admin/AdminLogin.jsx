import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../store/useAuth';
import { Spinner, useToast } from '../components/ui';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role !== 'admin') {
        toast.error('Ce compte n’a pas accès à l’administration.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/logo-almadi.png" alt="" className="mx-auto h-16 w-16 rounded-full bg-white p-1" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Almadi Shop</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold-500">
            <FiShield className="h-3.5 w-3.5" /> Espace administrateur
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-lift">
          <div>
            <label className="label" htmlFor="ad-email">Adresse e-mail</label>
            <input
              id="ad-email" type="email" required autoFocus className="input"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label" htmlFor="ad-pass">Mot de passe</label>
            <input
              id="ad-pass" type="password" required className="input"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner className="h-4 w-4" /> : <FiLock className="h-4 w-4" />} Se connecter
          </button>
          <p className="text-center text-xs text-ink-400">
            Après 8 tentatives échouées, l'accès est bloqué 15 minutes.
          </p>
        </form>
      </div>
    </div>
  );
}
