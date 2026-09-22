import { useState } from 'react';
import { SiVisa, SiMastercard, SiAmericanexpress, SiOrange } from 'react-icons/si';
import { FiTruck } from 'react-icons/fi';

/**
 * Logos des moyens de paiement.
 *
 * Visa / Mastercard / American Express / Orange proviennent de la
 * bibliothèque « simple-icons » (via react-icons) : ce sont les tracés
 * officiels des marques, pas des dessins refaits à la main.
 *
 * Wave n'est présent dans aucune bibliothèque d'icônes libre. Le composant
 * charge donc « /payments/wave.svg ». Déposez-y le logo officiel récupéré
 * sur la page « Brand assets » de Wave Business (voir public/payments/LISEZMOI.txt).
 * Tant que le fichier n'est pas là, un libellé neutre est affiché : aucune
 * imitation du logo n'est inventée.
 */
function WaveMark({ className = 'h-6 w-auto' }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <span className="inline-flex h-6 items-center rounded bg-ink-950 px-2 text-[11px] font-bold tracking-wide text-white">
        WAVE
      </span>
    );
  }
  return (
    <img
      src="/payments/wave.svg"
      alt="Wave"
      className={className}
      loading="lazy"
      onError={() => setMissing(true)}
    />
  );
}

export const PAYMENT_BRANDS = {
  wave: { label: 'Wave', Mark: WaveMark, hint: 'Paiement mobile Wave' },
  orange_money: {
    label: 'Orange Money',
    Mark: ({ className }) => <SiOrange className={className} style={{ color: '#FF7900' }} />,
    hint: 'Paiement Orange Money',
  },
  card: {
    label: 'Carte bancaire',
    Mark: ({ className }) => (
      <span className="inline-flex items-center gap-2">
        <SiVisa className={className} style={{ color: '#1A1F71' }} />
        <SiMastercard className={className} style={{ color: '#EB001B' }} />
        <SiAmericanexpress className={className} style={{ color: '#2E77BC' }} />
      </span>
    ),
    hint: 'Visa, Mastercard, American Express',
  },
  cash: {
    label: 'À la livraison',
    Mark: ({ className }) => <FiTruck className={className} />,
    hint: 'Payez en espèces à la réception du colis',
  },
};

/** Bandeau de logos (pied de page, page panier, rassurance). */
export default function PaymentLogos({ methods, size = 'md', className = '' }) {
  const keys = methods && methods.length ? methods : Object.keys(PAYMENT_BRANDS);
  const h = size === 'lg' ? 'h-8 w-auto' : size === 'sm' ? 'h-5 w-auto' : 'h-6 w-auto';

  return (
    <ul className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {keys.map((key) => {
        const brand = PAYMENT_BRANDS[key];
        if (!brand) return null;
        const { Mark, label, hint } = brand;
        return (
          <li
            key={key}
            title={hint}
            // text-ink-900 est indispensable : sans lui, les icônes monochromes
            // héritent de la couleur du pied de page sombre et disparaissent
            // sur le fond blanc de la pastille.
            className="flex h-10 items-center rounded-lg border border-ink-100 bg-white px-3 text-ink-900 shadow-sm"
          >
            <Mark className={h} />
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
