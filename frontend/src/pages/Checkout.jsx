import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiMapPin, FiCreditCard, FiUser, FiLock, FiArrowLeft, FiInfo } from 'react-icons/fi';
import { api, mediaUrl } from '../lib/api';
import { useCart } from '../store/useCart';
import { useShop } from '../store/useShop';
import { useAuth } from '../store/useAuth';
import { PAYMENT_BRANDS } from '../components/PaymentLogos';
import { Spinner, useToast, EmptyState } from '../components/ui';
import { formatPrice } from '../lib/format';

const STEPS = [
  { key: 'livraison', label: 'Livraison', Icon: FiMapPin },
  { key: 'paiement', label: 'Paiement', Icon: FiCreditCard },
  { key: 'validation', label: 'Validation', Icon: FiCheck },
];

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { items, clear, close } = useCart();
  const subtotal = useCart((s) => s.subtotal());
  const { settings, zones } = useShop();
  const { user } = useAuth();

  // Le tiroir du panier n'a rien à faire par-dessus le tunnel de commande.
  useEffect(() => { close(); }, [close]);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [couponCode] = useState(location.state?.couponCode || null);
  const [coupon, setCoupon] = useState(null);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', landmark: '', note: '',
    zoneId: '', paymentMethod: '',
  });

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email || '', phone: f.phone || user.phone || '' }));
  }, [user]);

  useEffect(() => {
    if (couponCode && subtotal > 0) {
      api.validateCoupon(couponCode, subtotal).then(setCoupon).catch(() => setCoupon(null));
    }
  }, [couponCode, subtotal]);

  const enabledMethods = useMemo(
    () => Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k),
    [settings]
  );

  const zone = zones.find((z) => String(z.id) === String(form.zoneId));
  const freeFrom = settings?.freeShippingFrom || 0;
  const freeShipping = coupon?.freeShipping || (freeFrom > 0 && subtotal >= freeFrom);
  const deliveryFee = !zone ? 0 : freeShipping ? 0 : zone.fee;
  const discount = coupon && !coupon.freeShipping ? coupon.discount : 0;
  const total = Math.max(subtotal - discount, 0) + deliveryFee;

  const zonesByRegion = useMemo(() => {
    const groups = {};
    zones.forEach((z) => { (groups[z.region] = groups[z.region] || []).push(z); });
    return groups;
  }, [zones]);

  if (!items.length) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Aucun article à commander"
          description="Votre panier est vide."
          action={<Link to="/boutique" className="btn-gold">Aller à la boutique</Link>}
        />
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validateStep0 = () => {
    if (form.name.trim().length < 2) return 'Indiquez votre nom complet.';
    if (form.phone.replace(/\D/g, '').length < 8) return 'Indiquez un numéro de téléphone valide.';
    if (form.address.trim().length < 5) return 'Indiquez une adresse de livraison précise.';
    if (!form.zoneId) return 'Choisissez votre zone de livraison.';
    return null;
  };

  const next = () => {
    if (step === 0) {
      const err = validateStep0();
      if (err) return toast.error(err);
    }
    if (step === 1 && !form.paymentMethod) return toast.error('Choisissez un moyen de paiement.');
    setStep((s) => Math.min(s + 1, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.createOrder({
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim(),
          landmark: form.landmark.trim() || undefined,
          note: form.note.trim() || undefined,
        },
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          variant: i.variant || undefined,
        })),
        zoneId: Number(form.zoneId),
        paymentMethod: form.paymentMethod,
        couponCode: coupon?.code || undefined,
      });
      clear();
      navigate('/commande/confirmee', { state: { order: res } });
    } catch (err) {
      toast.error(err.message);
      if (err.details?.length) err.details.forEach((d) => toast.error(d));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-app py-8 sm:py-12">
      <Link to="/panier" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-gold-600">
        <FiArrowLeft className="h-4 w-4" /> Retour au panier
      </Link>

      {/* Étapes */}
      <ol className="mb-9 flex items-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-400'
              }`}
            >
              {i < step ? <FiCheck className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${i <= step ? 'text-ink-950' : 'text-ink-400'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-0.5 flex-1 rounded ${i < step ? 'bg-emerald-600' : 'bg-ink-100'}`} />
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* ---------------------- Étape 1 : livraison ---------------------- */}
          {step === 0 && (
            <div className="card space-y-5 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <FiUser className="h-5 w-5 text-gold-600" /> Vos coordonnées
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="co-name">Nom complet *</label>
                  <input id="co-name" className="input" value={form.name} onChange={set('name')} placeholder="Aïssatou Diallo" autoComplete="name" />
                </div>
                <div>
                  <label className="label" htmlFor="co-phone">Téléphone *</label>
                  <input id="co-phone" className="input" value={form.phone} onChange={set('phone')} placeholder="625 00 33 39" inputMode="tel" autoComplete="tel" />
                  <p className="mt-1 text-xs text-ink-400">Nous vous appelons pour confirmer la commande.</p>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="co-email">E-mail (facultatif)</label>
                <input id="co-email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="vous@email.com" autoComplete="email" />
              </div>

              <h2 className="flex items-center gap-2 border-t border-ink-100 pt-5 font-display text-lg font-bold">
                <FiMapPin className="h-5 w-5 text-gold-600" /> Adresse de livraison
              </h2>

              <div>
                <label className="label" htmlFor="co-zone">Zone de livraison *</label>
                <select id="co-zone" className="input" value={form.zoneId} onChange={set('zoneId')}>
                  <option value="">Choisissez votre zone…</option>
                  {Object.entries(zonesByRegion).map(([region, list]) => (
                    <optgroup key={region} label={region}>
                      {list.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} — {formatPrice(z.fee)} · {z.delay}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="co-address">Adresse précise *</label>
                <input id="co-address" className="input" value={form.address} onChange={set('address')} placeholder="Quartier Kipé, rue KA-020, immeuble bleu" autoComplete="street-address" />
              </div>

              <div>
                <label className="label" htmlFor="co-landmark">Point de repère</label>
                <input id="co-landmark" className="input" value={form.landmark} onChange={set('landmark')} placeholder="En face de la pharmacie, à côté du marché" />
              </div>

              <div>
                <label className="label" htmlFor="co-note">Note pour le livreur</label>
                <textarea id="co-note" rows={3} className="input resize-none" value={form.note} onChange={set('note')} placeholder="Appelez avant d'arriver, livraison après 17 h…" />
              </div>

              <button onClick={next} className="btn-gold w-full sm:w-auto sm:px-10">Continuer vers le paiement</button>
            </div>
          )}

          {/* ---------------------- Étape 2 : paiement ----------------------- */}
          {step === 1 && (
            <div className="card space-y-5 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <FiCreditCard className="h-5 w-5 text-gold-600" /> Moyen de paiement
              </h2>

              <div className="space-y-3">
                {enabledMethods.map((key) => {
                  const brand = PAYMENT_BRANDS[key];
                  if (!brand) return null;
                  const { Mark, label, hint } = brand;
                  const active = form.paymentMethod === key;
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                        active ? 'border-gold-500 bg-gold-50/50' : 'border-ink-100 hover:border-ink-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={key}
                        checked={active}
                        onChange={() => setForm((f) => ({ ...f, paymentMethod: key }))}
                        className="h-4 w-4 text-gold-600 focus:ring-gold-500"
                      />
                      <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-ink-100 bg-white">
                        <Mark className="h-6 w-auto" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-ink-950">{label}</span>
                        <span className="block text-xs text-ink-500">{hint}</span>
                      </span>
                      {active && <FiCheck className="h-5 w-5 text-gold-600" />}
                    </label>
                  );
                })}
              </div>

              {form.paymentMethod && form.paymentMethod !== 'cash' && (
                <div className="flex gap-3 rounded-xl bg-ink-50 p-4 text-xs leading-relaxed text-ink-600">
                  <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <p>
                    {form.paymentMethod === 'card'
                      ? "Le paiement par carte est finalisé sur la page sécurisée de notre prestataire bancaire. Aucune donnée de carte ne transite par la boutique."
                      : `Après validation, le numéro ${form.paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} du marchand s'affiche. Effectuez le transfert, puis envoyez la capture par WhatsApp : votre colis part dès confirmation.`}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-outline">Retour</button>
                <button onClick={next} className="btn-gold flex-1 sm:flex-none sm:px-10">Vérifier ma commande</button>
              </div>
            </div>
          )}

          {/* --------------------- Étape 3 : validation ---------------------- */}
          {step === 2 && (
            <div className="card space-y-6 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <FiCheck className="h-5 w-5 text-gold-600" /> Vérifiez votre commande
              </h2>

              <section>
                <h3 className="label">Livraison</h3>
                <div className="rounded-xl bg-ink-50 p-4 text-sm">
                  <p className="font-semibold text-ink-950">{form.name}</p>
                  <p className="text-ink-600">{form.phone}{form.email && ` · ${form.email}`}</p>
                  <p className="mt-2 text-ink-600">{form.address}</p>
                  {form.landmark && <p className="text-ink-500">Repère : {form.landmark}</p>}
                  <p className="mt-2 font-medium text-ink-800">
                    {zone?.name} ({zone?.region}) — {zone?.delay}
                  </p>
                  {form.note && <p className="mt-2 italic text-ink-500">« {form.note} »</p>}
                </div>
                <button onClick={() => setStep(0)} className="mt-2 text-xs font-semibold text-gold-700 underline">Modifier</button>
              </section>

              <section>
                <h3 className="label">Paiement</h3>
                <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-4">
                  {(() => {
                    const brand = PAYMENT_BRANDS[form.paymentMethod];
                    if (!brand) return null;
                    const { Mark, label } = brand;
                    return (
                      <>
                        <span className="flex h-10 w-16 items-center justify-center rounded-lg border border-ink-100 bg-white">
                          <Mark className="h-6 w-auto" />
                        </span>
                        <span className="text-sm font-semibold">{label}</span>
                      </>
                    );
                  })()}
                </div>
                <button onClick={() => setStep(1)} className="mt-2 text-xs font-semibold text-gold-700 underline">Modifier</button>
              </section>

              <section>
                <h3 className="label">Articles ({items.length})</h3>
                <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                  {items.map((i) => (
                    <li key={i.key} className="flex items-center gap-3 p-3">
                      {i.image ? (
                        <img src={mediaUrl(i.image)} alt="" className="h-14 w-12 rounded-lg object-cover" />
                      ) : (
                        <span className="h-14 w-12 rounded-lg bg-ink-100" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.name}</span>
                        <span className="block text-xs text-ink-500">
                          {i.variant ? `${i.variant} · ` : ''}Quantité : {i.quantity}
                        </span>
                      </span>
                      <span className="text-sm font-bold">{formatPrice(i.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <button onClick={submit} disabled={submitting} className="btn-gold w-full">
                {submitting ? <Spinner className="h-4 w-4" /> : <FiLock className="h-4 w-4" />}
                {submitting ? 'Envoi en cours…' : `Confirmer ma commande — ${formatPrice(total)}`}
              </button>
              <p className="text-center text-xs text-ink-400">
                En confirmant, vous acceptez nos <Link to="/page/cgv" className="underline">conditions de vente</Link>.
              </p>
            </div>
          )}
        </div>

        {/* Récapitulatif latéral */}
        <aside className="h-fit lg:sticky lg:top-28">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Votre commande</h2>

            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.key} className="flex gap-3">
                  {i.image ? (
                    <img src={mediaUrl(i.image)} alt="" className="h-14 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-14 w-12 shrink-0 rounded-lg bg-ink-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-xs font-medium leading-snug">{i.name}</span>
                    <span className="text-xs text-ink-500">× {i.quantity}</span>
                  </span>
                  <span className="text-xs font-bold">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-ink-100 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Sous-total</dt>
                <dd className="font-semibold">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Code « {coupon.code} »</dt>
                  <dd className="font-semibold">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">Livraison</dt>
                <dd className="font-semibold">
                  {!zone ? <span className="text-xs text-ink-400">À définir</span>
                    : deliveryFee === 0 ? <span className="text-emerald-700">Offerte</span>
                    : formatPrice(deliveryFee)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                <dt className="font-bold">Total à payer</dt>
                <dd className="text-xl font-bold">{formatPrice(total)}</dd>
              </div>
            </dl>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
              <FiLock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Vos informations sont transmises de façon chiffrée et ne servent qu'à traiter votre commande.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
