import { useEffect, useState } from 'react';
import { FiSave, FiLock, FiShield } from 'react-icons/fi';
import { adminApi } from '../lib/api';
import { Spinner, useToast } from '../components/ui';
import { PAYMENT_BRANDS } from '../components/PaymentLogos';
import { SEASONS, formatPrice } from '../lib/format';

export default function Settings() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pass, setPass] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    adminApi.settings().then(setForm).catch((e) => toast.error(e.message));
  }, [toast]);

  if (!form) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-gold-600" /></div>;

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target.checked ? '1' : '0') : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setForm(await adminApi.saveSettings(form));
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pass.next !== pass.confirm) return toast.error('Les deux mots de passe ne correspondent pas.');
    try {
      await adminApi.adminPassword(pass.current, pass.next);
      toast.success('Mot de passe administrateur modifié');
      setPass({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const Field = ({ label, k, type = 'text', hint, ...rest }) => (
    <div>
      <label className="label" htmlFor={`st-${k}`}>{label}</label>
      <input id={`st-${k}`} type={type} className="input" value={form[k] ?? ''} onChange={set(k)} {...rest} />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-950">Paramètres</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ces informations alimentent l'en-tête, le pied de page et les pages d'aide de la boutique.
        </p>
      </header>

      <form onSubmit={save} className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">Identité de la boutique</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la boutique" k="shop_name" />
            <Field label="Slogan" k="shop_tagline" />
            <Field label="Téléphone affiché" k="phone" />
            <Field label="Numéro WhatsApp (chiffres uniquement)" k="whatsapp" hint="Exemple : 224625003339" />
            <Field label="Adresse e-mail" k="email" type="email" />
            <Field label="Adresse physique" k="address" />
          </div>
          <div>
            <label className="label" htmlFor="st-announcement">Bandeau d'annonce</label>
            <input id="st-announcement" className="input" value={form.announcement ?? ''} onChange={set('announcement')} />
            <p className="mt-1 text-xs text-ink-400">Affiché en haut de chaque page. Laissez vide pour le masquer.</p>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">Réseaux sociaux</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Facebook" k="facebook" placeholder="https://facebook.com/almadishop" />
            <Field label="Instagram" k="instagram" placeholder="https://instagram.com/almadishop" />
            <Field label="TikTok" k="tiktok" placeholder="https://tiktok.com/@almadishop" />
          </div>
          <p className="text-xs text-ink-400">Les icônes n'apparaissent dans le pied de page que si l'adresse est renseignée.</p>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">Commercial</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="st-free">Livraison offerte à partir de (GNF)</label>
              <input id="st-free" type="number" min="0" className="input"
                value={form.free_shipping_from ?? ''} onChange={set('free_shipping_from')} />
              <p className="mt-1 text-xs text-ink-400">
                Actuellement : {formatPrice(form.free_shipping_from || 0)}. Mettre 0 pour désactiver.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="st-season">Saison mise en avant</label>
              <select id="st-season" className="input" value={form.active_season ?? ''} onChange={set('active_season')}>
                {Object.entries(SEASONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-400">
                Pilote la section « Collection … » de la page d'accueil : changez-la à chaque saison.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="st-low">Seuil d'alerte stock par défaut</label>
              <input id="st-low" type="number" min="0" className="input"
                value={form.low_stock_alert ?? ''} onChange={set('low_stock_alert')} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">Moyens de paiement</h2>
          <p className="text-sm text-ink-500">
            Décochez un moyen de paiement pour le retirer immédiatement de la page de commande.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['pay_wave', 'wave'],
              ['pay_orange_money', 'orange_money'],
              ['pay_card', 'card'],
              ['pay_cash', 'cash'],
            ].map(([key, brandKey]) => {
              const brand = PAYMENT_BRANDS[brandKey];
              const { Mark, label, hint } = brand;
              return (
                <label key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                    form[key] === '1' ? 'border-gold-400 bg-gold-50/40' : 'border-ink-100'
                  }`}>
                  <input type="checkbox" checked={form[key] === '1'} onChange={set(key)}
                    className="h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-500" />
                  <span className="flex h-9 w-14 items-center justify-center rounded-lg border border-ink-100 bg-white">
                    <Mark className="h-5 w-auto" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="block truncate text-xs text-ink-500">{hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Numéro marchand Wave" k="wave_number"
              hint="Communiqué à la cliente après validation de sa commande." />
            <Field label="Numéro marchand Orange Money" k="orange_money_number"
              hint="Idem : affiché sur la page de confirmation." />
          </div>
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <button type="submit" disabled={saving} className="btn-gold shadow-lift">
            {saving ? <Spinner className="h-4 w-4" /> : <FiSave className="h-4 w-4" />} Enregistrer les paramètres
          </button>
        </div>
      </form>

      {/* Sécurité */}
      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <FiShield className="h-5 w-5 text-gold-600" /> Sécurité du compte administrateur
        </h2>

        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="label" htmlFor="pw-cur">Mot de passe actuel</label>
            <input id="pw-cur" type="password" required className="input"
              value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })}
              autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">Nouveau mot de passe</label>
            <input id="pw-new" type="password" required minLength={10} className="input"
              value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })}
              autoComplete="new-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-conf">Confirmer</label>
            <input id="pw-conf" type="password" required minLength={10} className="input"
              value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })}
              autoComplete="new-password" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary btn-sm"><FiLock className="h-4 w-4" /> Changer le mot de passe</button>
          </div>
        </form>

        <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <strong>À faire dès la mise en ligne :</strong> remplacez le mot de passe fourni à l'installation par
          un mot de passe long (10 caractères minimum, chiffres et symboles). C'est ce compte qui donne accès
          aux commandes et aux coordonnées de vos clientes.
        </p>
      </section>
    </div>
  );
}
