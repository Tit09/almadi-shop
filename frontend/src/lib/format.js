/** Formatage monétaire : le franc guinéen ne s'écrit jamais avec des décimales. */
export const formatPrice = (value, currency = 'GNF') =>
  `${Number(value || 0).toLocaleString('fr-FR').replace(/ /g, ' ')} ${currency}`;

export const formatNumber = (value) =>
  Number(value || 0).toLocaleString('fr-FR').replace(/ /g, ' ');

export const formatDate = (iso, withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const relativeDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return formatDate(iso);
};

export const SEASONS = {
  ete: { label: 'Été', short: 'Été' },
  ramadan: { label: 'Ramadan', short: 'Ramadan' },
  decembre: { label: 'Fêtes de décembre', short: 'Décembre' },
  rentree: { label: 'Rentrée scolaire', short: 'Rentrée' },
  toute_saison: { label: 'Toute l’année', short: 'Toute saison' },
};

export const ORDER_STATUS = {
  pending: { label: 'En attente', tone: 'bg-amber-100 text-amber-800', step: 0 },
  confirmed: { label: 'Confirmée', tone: 'bg-blue-100 text-blue-800', step: 1 },
  packed: { label: 'Préparée', tone: 'bg-indigo-100 text-indigo-800', step: 2 },
  shipped: { label: 'En livraison', tone: 'bg-violet-100 text-violet-800', step: 3 },
  delivered: { label: 'Livrée', tone: 'bg-emerald-100 text-emerald-800', step: 4 },
  cancelled: { label: 'Annulée', tone: 'bg-rose-100 text-rose-800', step: -1 },
};

export const PAYMENT_STATUS = {
  pending: { label: 'En attente', tone: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Payée', tone: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Échouée', tone: 'bg-rose-100 text-rose-800' },
  refunded: { label: 'Remboursée', tone: 'bg-ink-100 text-ink-700' },
};

export const PAYMENT_METHODS = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
  cash: 'À la livraison',
};

/** Lien WhatsApp pré-rempli — le canal de vente n°1 en Guinée. */
export const whatsappLink = (number, message) =>
  `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(message || '')}`;
