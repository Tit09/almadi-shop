import { Link, useParams } from 'react-router-dom';
import { FiPhone, FiMail, FiMapPin, FiClock } from 'react-icons/fi';
import { SiWhatsapp } from 'react-icons/si';
import { useShop } from '../store/useShop';
import PaymentLogos from '../components/PaymentLogos';
import { formatPrice, whatsappLink } from '../lib/format';

/** Pages d'information éditables depuis le code (contenu rédactionnel stable). */
const PAGES = {
  livraison: {
    title: 'Livraison & délais',
    intro: 'Almadi Shop livre dans tout Conakry et dans les principales villes de Guinée.',
    sections: [
      {
        h: 'Conakry',
        p: `Livraison le jour même pour les commandes validées avant 14 h à Kaloum, Dixinn et Matam. Livraison sous 24 h à Ratoma et Matoto. Les frais varient de 20 000 à 25 000 GNF selon la commune ; ils s'affichent avant la validation de la commande.`,
      },
      {
        h: 'Périphérie et intérieur du pays',
        p: `Coyah et Dubréka sous 24 à 48 h. Kindia, Boké, Labé, Kankan et N'Zérékoré sous 2 à 5 jours ouvrés via nos compagnies de transport partenaires. Le livreur vous contacte à l'arrivée du colis.`,
      },
      {
        h: 'Livraison offerte',
        p: `Les frais de livraison sont offerts au-delà d'un certain montant d'achat, indiqué dans votre panier et mis à jour régulièrement par la boutique.`,
      },
      {
        h: 'Suivi',
        p: `Chaque commande reçoit un numéro de la forme ALM-AAMMJJ-XXXX. Ce numéro, associé à votre téléphone, permet de suivre l'avancement à tout moment depuis la page « Suivre ma commande ».`,
      },
    ],
  },
  retours: {
    title: 'Échanges & retours',
    intro: 'Un article ne convient pas ? Nous procédons à l’échange dans les 48 heures.',
    sections: [
      { h: 'Conditions', p: `L'échange est possible dans les 48 heures suivant la réception, à condition que l'article n'ait pas été porté, qu'il soit propre et que son étiquette d'origine soit toujours attachée.` },
      { h: 'Articles non repris', p: `Pour des raisons d'hygiène, les sous-vêtements, les voiles déballés et les articles personnalisés ne sont ni repris ni échangés. Les articles vendus en promotion finale ne sont pas repris.` },
      { h: 'Comment procéder', p: `Appelez la boutique ou écrivez-nous sur WhatsApp avec votre numéro de commande et une photo de l'article. Nous convenons d'un passage du livreur ou d'un dépôt en boutique.` },
      { h: 'Article endommagé', p: `Si un article arrive abîmé, signalez-le dans les 24 heures avec une photo : nous le remplaçons à nos frais ou vous remboursons intégralement.` },
    ],
  },
  paiement: {
    title: 'Moyens de paiement',
    intro: 'Payez comme cela vous arrange : mobile, carte bancaire ou en espèces à la réception.',
    sections: [
      { h: 'Wave', p: `Après validation de votre commande, le numéro marchand Wave s'affiche. Effectuez le transfert du montant exact en indiquant votre numéro de commande, puis envoyez-nous la capture d'écran sur WhatsApp.` },
      { h: 'Orange Money', p: `Même principe qu'avec Wave : transfert vers le numéro marchand affiché, en précisant votre numéro de commande en motif. La confirmation est généralement traitée en moins de 30 minutes aux heures d'ouverture.` },
      { h: 'Carte bancaire (Visa, Mastercard, American Express)', p: `Un lien de paiement sécurisé émis par notre prestataire bancaire vous est transmis. Aucune donnée de carte ne transite ni n'est stockée par la boutique.` },
      { h: 'Paiement à la livraison', p: `Réglez en espèces au moment où le livreur vous remet le colis. Préparez si possible l'appoint. Un reçu vous est remis.` },
    ],
  },
  cgv: {
    title: 'Conditions générales de vente',
    intro: 'Conditions applicables à toute commande passée sur almadishop.com.',
    sections: [
      { h: '1. Identité du vendeur', p: `Almadi Shop, commerce de détail de vêtements, maroquinerie et fournitures scolaires, établi à Conakry, République de Guinée. Téléphone : +224 625 00 33 39.` },
      { h: '2. Produits et prix', p: `Les prix sont indiqués en francs guinéens (GNF), toutes taxes comprises, hors frais de livraison. Les photographies des produits sont non contractuelles. Almadi Shop se réserve le droit de modifier ses prix à tout moment ; le prix appliqué est celui affiché au moment de la validation de la commande.` },
      { h: '3. Commande', p: `Toute commande fait l'objet d'un appel de confirmation. Almadi Shop peut refuser ou annuler une commande en cas d'indisponibilité de l'article, d'adresse manifestement erronée ou de litige antérieur non réglé.` },
      { h: '4. Livraison', p: `Les délais annoncés sont indicatifs et courent à compter de la confirmation de la commande. Un retard de livraison ne peut donner lieu à annulation de la vente ni à indemnité, sauf faute caractérisée du vendeur.` },
      { h: '5. Paiement', p: `Le paiement s'effectue par Wave, Orange Money, carte bancaire ou en espèces à la livraison. Pour les paiements mobiles, l'expédition intervient après confirmation de la réception des fonds.` },
      { h: '6. Échange et rétractation', p: `Conformément à notre politique commerciale, l'échange est possible sous 48 heures dans les conditions décrites à la page « Échanges & retours ».` },
      { h: '7. Données personnelles', p: `Les données collectées (nom, téléphone, adresse, e-mail) servent exclusivement au traitement et au suivi des commandes. Elles ne sont ni vendues ni cédées à des tiers autres que le prestataire de livraison.` },
      { h: '8. Litiges', p: `Tout litige relève de la compétence des juridictions de Conakry. Un règlement amiable sera systématiquement recherché au préalable.` },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: 'Ce que nous collectons, pourquoi, et combien de temps nous le conservons.',
    sections: [
      { h: 'Données collectées', p: `Nom, numéro de téléphone, adresse de livraison et, facultativement, adresse e-mail. Lors de la création d'un compte, votre mot de passe est stocké sous forme chiffrée et irréversible : personne, pas même la boutique, ne peut le lire.` },
      { h: 'Finalité', p: `Ces informations servent uniquement à préparer, livrer et suivre vos commandes, ainsi qu'à vous contacter en cas de problème sur une commande.` },
      { h: 'Conservation', p: `Les données de commande sont conservées le temps nécessaire à la gestion commerciale et comptable. Vous pouvez demander la suppression de votre compte à tout moment en nous contactant.` },
      { h: 'Partage', p: `Aucune donnée n'est revendue. Seules les informations strictement nécessaires (nom, téléphone, adresse) sont transmises au livreur.` },
      { h: 'Vos droits', p: `Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à la boutique par téléphone ou par e-mail.` },
    ],
  },
  apropos: {
    title: 'À propos d’Almadi Shop',
    intro: 'Une boutique guinéenne, une sélection renouvelée à chaque saison.',
    sections: [
      { h: 'Notre histoire', p: `Almadi Shop est née à Conakry d'une conviction simple : la mode féminine de qualité ne devrait pas obliger à commander à l'étranger et à attendre des semaines. Nous sélectionnons chaque pièce nous-mêmes et la contrôlons avant expédition.` },
      { h: 'Une collection par saison', p: `Tenues légères pour la saison chaude, abayas et caftans pour le Ramadan, robes de cérémonie pour les fêtes de décembre, cartables et fournitures pour la rentrée : notre catalogue suit le calendrier de nos clientes.` },
      { h: 'Notre engagement', p: `Des prix affichés clairement, des frais de livraison connus avant de valider, et une équipe joignable au téléphone comme sur WhatsApp. Si un article ne convient pas, nous l'échangeons.` },
    ],
  },
};

export default function StaticPage() {
  const { slug } = useParams();
  const { settings } = useShop();
  const page = PAGES[slug];

  if (slug === 'contact') return <Contact settings={settings} />;

  if (!page) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="section-title">Page introuvable</h1>
        <Link to="/" className="btn-gold mt-6">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="container-app max-w-3xl py-10 sm:py-16">
      <h1 className="section-title">{page.title}</h1>
      <p className="mt-3 text-base text-ink-600">{page.intro}</p>

      <div className="mt-10 space-y-8">
        {page.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-lg font-semibold text-ink-950">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.p}</p>
          </section>
        ))}
      </div>

      {slug === 'paiement' && (
        <div className="mt-10 rounded-2xl border border-ink-100 bg-ink-50/60 p-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-500">Moyens acceptés</p>
          <PaymentLogos size="lg" />
        </div>
      )}

      {slug === 'livraison' && settings?.freeShippingFrom > 0 && (
        <p className="mt-10 rounded-2xl bg-gold-50 p-5 text-sm font-semibold text-gold-900">
          Livraison offerte dès {formatPrice(settings.freeShippingFrom)} d'achat.
        </p>
      )}

      <div className="mt-12 flex flex-wrap gap-3 border-t border-ink-100 pt-8">
        <Link to="/boutique" className="btn-gold">Voir la boutique</Link>
        <Link to="/page/contact" className="btn-outline">Nous contacter</Link>
      </div>
    </div>
  );
}

function Contact({ settings }) {
  const phone = settings?.phone || '+224 625 00 33 39';
  return (
    <div className="container-app max-w-4xl py-10 sm:py-16">
      <h1 className="section-title">Nous contacter</h1>
      <p className="mt-3 text-base text-ink-600">
        Une question sur une taille, une disponibilité ou une livraison ? Notre équipe répond du lundi au samedi.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="card group p-6 transition hover:border-gold-300 hover:shadow-lift">
          <FiPhone className="h-7 w-7 text-gold-600" />
          <h2 className="mt-4 font-display text-lg font-bold">Par téléphone</h2>
          <p className="mt-1 text-sm text-ink-500">Le plus rapide pour confirmer une commande.</p>
          <p className="mt-3 font-bold text-ink-950 group-hover:text-gold-700">{phone}</p>
        </a>

        {settings?.whatsapp && (
          <a
            href={whatsappLink(settings.whatsapp, 'Bonjour Almadi Shop, j’ai une question.')}
            target="_blank" rel="noreferrer noopener"
            className="card group p-6 transition hover:border-[#25D366] hover:shadow-lift"
          >
            <SiWhatsapp className="h-7 w-7 text-[#25D366]" />
            <h2 className="mt-4 font-display text-lg font-bold">Sur WhatsApp</h2>
            <p className="mt-1 text-sm text-ink-500">Envoyez-nous une photo ou une capture de paiement.</p>
            <p className="mt-3 font-bold text-ink-950 group-hover:text-[#128C7E]">Ouvrir la conversation</p>
          </a>
        )}

        {settings?.email && (
          <a href={`mailto:${settings.email}`} className="card group p-6 transition hover:border-gold-300 hover:shadow-lift">
            <FiMail className="h-7 w-7 text-gold-600" />
            <h2 className="mt-4 font-display text-lg font-bold">Par e-mail</h2>
            <p className="mt-1 text-sm text-ink-500">Pour les demandes détaillées ou les partenariats.</p>
            <p className="mt-3 font-bold text-ink-950 group-hover:text-gold-700">{settings.email}</p>
          </a>
        )}

        <div className="card p-6">
          <FiMapPin className="h-7 w-7 text-gold-600" />
          <h2 className="mt-4 font-display text-lg font-bold">Boutique</h2>
          <p className="mt-1 text-sm text-ink-500">{settings?.address || 'Conakry, République de Guinée'}</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink-700">
            <FiClock className="h-4 w-4 text-gold-600" /> Lundi – Samedi, 8 h – 20 h
          </p>
        </div>
      </div>
    </div>
  );
}
