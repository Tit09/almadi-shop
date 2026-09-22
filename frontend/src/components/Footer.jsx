import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPhone, FiMail, FiMapPin, FiSend, FiCheck } from 'react-icons/fi';
import { SiWhatsapp, SiFacebook, SiInstagram, SiTiktok } from 'react-icons/si';
import { useShop } from '../store/useShop';
import { api } from '../lib/api';
import PaymentLogos from './PaymentLogos';
import { whatsappLink } from '../lib/format';
import { Spinner } from './ui';

export default function Footer() {
  const { settings, categories } = useShop();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    setState('loading');
    try {
      await api.newsletter(email);
      setState('done');
      setEmail('');
    } catch {
      setState('idle');
    }
  };

  const phone = settings?.phone || '+224 625 00 33 39';
  const enabled = Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k);
  const socials = [
    { key: 'whatsapp', Icon: SiWhatsapp, href: settings?.whatsapp ? whatsappLink(settings.whatsapp, 'Bonjour Almadi Shop, je souhaite des informations.') : null, label: 'WhatsApp' },
    { key: 'facebook', Icon: SiFacebook, href: settings?.facebook, label: 'Facebook' },
    { key: 'instagram', Icon: SiInstagram, href: settings?.instagram, label: 'Instagram' },
    { key: 'tiktok', Icon: SiTiktok, href: settings?.tiktok, label: 'TikTok' },
  ].filter((s) => s.href);

  return (
    <footer className="mt-16 bg-ink-950 text-ink-200">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="container-app flex flex-col items-center gap-5 py-10 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <h3 className="font-display text-xl font-semibold text-white">Restez informée des nouveautés</h3>
            <p className="mt-1 text-sm text-ink-400">Collections de saison, promotions et arrivages — sans spam.</p>
          </div>
          <form onSubmit={submit} className="flex w-full max-w-md gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-ink-500 focus:border-gold-500 focus:outline-none"
              aria-label="Votre adresse e-mail"
            />
            <button type="submit" disabled={state !== 'idle'} className="btn-gold shrink-0">
              {state === 'loading' ? <Spinner className="h-4 w-4" /> : state === 'done' ? <FiCheck className="h-4 w-4" /> : <FiSend className="h-4 w-4" />}
              <span className="hidden sm:inline">{state === 'done' ? 'Inscrite' : "S'inscrire"}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="container-app grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo-almadi.png" alt="" className="h-12 w-12 rounded-full bg-white p-0.5" />
            <span className="font-display text-lg font-bold text-white">Almadi Shop</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            {settings?.tagline || 'Mode femme par saison, sacs et fournitures scolaires, livrés partout en Guinée.'}
          </p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ key, Icon, href, label }) => (
                <a
                  key={key} href={href} target="_blank" rel="noreferrer noopener" aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-ink-300 transition hover:border-gold-500 hover:bg-gold-500 hover:text-ink-950"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Nos rayons</h4>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/categorie/${c.slug}`} className="text-ink-400 transition hover:text-gold-400">{c.name}</Link>
              </li>
            ))}
            <li><Link to="/boutique?new=1" className="text-ink-400 transition hover:text-gold-400">Nouveautés</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Aide & infos</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/suivi" className="text-ink-400 transition hover:text-gold-400">Suivre ma commande</Link></li>
            <li><Link to="/page/livraison" className="text-ink-400 transition hover:text-gold-400">Livraison & délais</Link></li>
            <li><Link to="/page/retours" className="text-ink-400 transition hover:text-gold-400">Échanges & retours</Link></li>
            <li><Link to="/page/paiement" className="text-ink-400 transition hover:text-gold-400">Moyens de paiement</Link></li>
            <li><Link to="/page/cgv" className="text-ink-400 transition hover:text-gold-400">Conditions de vente</Link></li>
            <li><Link to="/page/contact" className="text-ink-400 transition hover:text-gold-400">Nous contacter</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
          <ul className="space-y-3 text-sm text-ink-400">
            <li>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-start gap-3 transition hover:text-gold-400">
                <FiPhone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <span className="font-semibold text-white">{phone}</span>
              </a>
            </li>
            {settings?.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-start gap-3 transition hover:text-gold-400">
                  <FiMail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /> {settings.email}
                </a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              {settings?.address || 'Conakry, République de Guinée'}
            </li>
          </ul>

          <div className="mt-6">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Paiement sécurisé</h4>
            <PaymentLogos methods={enabled} size="sm" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-5 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Almadi Shop — Tous droits réservés.</p>
          <p className="flex items-center gap-3">
            <Link to="/page/cgv" className="transition hover:text-gold-400">Mentions légales</Link>
            <span className="text-ink-700">·</span>
            <Link to="/page/confidentialite" className="transition hover:text-gold-400">Confidentialité</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
