import { Link, useLocation, Navigate } from 'react-router-dom';
import { FiCheckCircle, FiCopy, FiPackage, FiPhone, FiPrinter } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { useShop } from '../store/useShop';
import { PAYMENT_BRANDS } from '../components/PaymentLogos';
import { useToast } from '../components/ui';
import { formatPrice, whatsappLink } from '../lib/format';

export default function OrderSuccess() {
  const { state } = useLocation();
  const { settings } = useShop();
  const toast = useToast();

  if (!state?.order) return <Navigate to="/" replace />;
  const order = state.order;
  const brand = PAYMENT_BRANDS[order.paymentMethod];
  const needsTransfer = ['wave', 'orange_money'].includes(order.paymentMethod);

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Copié'))
      .catch(() => toast.error('Copie impossible'));
  };

  const waMessage =
    `Bonjour Almadi Shop, je viens de passer la commande ${order.orderNumber} ` +
    `d'un montant de ${formatPrice(order.total)}` +
    (needsTransfer ? `. Voici la preuve de mon paiement ${brand?.label}.` : '.');

  return (
    <div className="container-app max-w-3xl py-10 sm:py-16">
      <div className="card overflow-hidden">
        <div className="bg-emerald-600 px-6 py-10 text-center text-white">
          <FiCheckCircle className="mx-auto h-14 w-14" />
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Merci, votre commande est enregistrée</h1>
          <p className="mt-2 text-sm text-emerald-50">
            Notre équipe vous appelle sous peu pour confirmer la livraison.
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Numéro de commande</p>
              <p className="font-display text-xl font-bold tracking-wide text-ink-950">{order.orderNumber}</p>
            </div>
            <button onClick={() => copy(order.orderNumber)} className="btn-outline btn-sm">
              <FiCopy className="h-3.5 w-3.5" /> Copier
            </button>
          </div>

          <p className="text-sm text-ink-600">
            Conservez ce numéro : il vous permet de{' '}
            <Link to="/suivi" className="font-semibold text-gold-700 underline">suivre votre commande</Link>{' '}
            à tout moment avec votre numéro de téléphone.
          </p>

          <dl className="space-y-2.5 rounded-xl border border-ink-100 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">Sous-total</dt><dd className="font-semibold">{formatPrice(order.subtotal)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700"><dt>Remise</dt><dd className="font-semibold">−{formatPrice(order.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-600">Livraison</dt><dd className="font-semibold">{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</dd></div>
            <div className="flex items-baseline justify-between border-t border-ink-100 pt-2.5">
              <dt className="font-bold">Total à régler</dt>
              <dd className="text-xl font-bold">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          {/* Instructions de paiement */}
          {needsTransfer && order.paymentInstructions?.number && (
            <div className="rounded-xl border-2 border-gold-300 bg-gold-50/60 p-5">
              <div className="flex items-center gap-3">
                {brand && (
                  <span className="flex h-11 w-16 items-center justify-center rounded-lg border border-gold-200 bg-white">
                    <brand.Mark className="h-6 w-auto" />
                  </span>
                )}
                <h2 className="font-display text-lg font-bold">Finalisez votre paiement {brand?.label}</h2>
              </div>

              <ol className="mt-4 space-y-2.5 text-sm text-ink-700">
                <li className="flex gap-2.5">
                  <span className="font-bold text-gold-700">1.</span>
                  <span>
                    Envoyez <strong>{formatPrice(order.total)}</strong> au numéro marchand :
                    <button onClick={() => copy(order.paymentInstructions.number)} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-bold text-ink-950 shadow-sm">
                      {order.paymentInstructions.number} <FiCopy className="h-3 w-3" />
                    </button>
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-gold-700">2.</span>
                  <span>Indiquez le numéro <strong>{order.orderNumber}</strong> en motif du transfert.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-gold-700">3.</span>
                  <span>Envoyez-nous la capture d'écran sur WhatsApp pour accélérer la validation.</span>
                </li>
              </ol>
            </div>
          )}

          {order.paymentMethod === 'card' && (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-5 text-sm text-ink-700">
              <p className="font-semibold text-ink-950">Paiement par carte bancaire</p>
              <p className="mt-1.5">
                Notre conseiller vous transmet par SMS le lien de paiement sécurisé de la banque.
                Le colis part dès réception du règlement. Aucune donnée de carte n'est enregistrée par la boutique.
              </p>
            </div>
          )}

          {order.paymentMethod === 'cash' && (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-5 text-sm text-ink-700">
              <p className="font-semibold text-ink-950">Paiement à la livraison</p>
              <p className="mt-1.5">
                Préparez <strong>{formatPrice(order.total)}</strong> en espèces. Le livreur vous remet un reçu à la réception du colis.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {order.whatsapp && (
              <a
                href={whatsappLink(order.whatsapp, waMessage)}
                target="_blank" rel="noreferrer noopener"
                className="btn flex-1 bg-[#25D366] text-white hover:bg-[#1eb855] sm:flex-none sm:px-6"
              >
                <SiWhatsapp className="h-4 w-4" /> Nous écrire sur WhatsApp
              </a>
            )}
            <a href={`tel:${(settings?.phone || '').replace(/\s/g, '')}`} className="btn-outline flex-1 sm:flex-none sm:px-6">
              <FiPhone className="h-4 w-4" /> Appeler la boutique
            </a>
            <button onClick={() => window.print()} className="btn-ghost no-print">
              <FiPrinter className="h-4 w-4" /> Imprimer
            </button>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-6">
            <Link to="/suivi" className="btn-primary flex-1 sm:flex-none sm:px-6">
              <FiPackage className="h-4 w-4" /> Suivre ma commande
            </Link>
            <Link to="/boutique" className="btn-outline flex-1 sm:flex-none sm:px-6">Continuer mes achats</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
