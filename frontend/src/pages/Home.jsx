import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiTruck, FiShield, FiRefreshCw, FiHeadphones,
  FiChevronLeft, FiChevronRight, FiZap, FiTrendingUp,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { api, mediaUrl } from '../lib/api';
import { useShop } from '../store/useShop';
import ProductCard from '../components/ProductCard';
import PaymentLogos from '../components/PaymentLogos';
import { SkeletonGrid } from '../components/ui';
import { SEASONS } from '../lib/format';

/* --------------------------- Carrousel --------------------------- */
function HeroSlider({ banners }) {
  const [index, setIndex] = useState(0);
  const total = banners.length;

  useEffect(() => {
    if (total < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  if (!total) return null;
  const go = (d) => setIndex((i) => (i + d + total) % total);

  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="relative h-[380px] sm:h-[440px] lg:h-[520px]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {b.image ? (
              <img src={mediaUrl(b.image)} alt="" className="h-full w-full object-cover opacity-60" />
            ) : (
              <div
                className={`h-full w-full ${b.theme === 'dark'
                  ? 'bg-[radial-gradient(circle_at_30%_20%,#2c2c2c,#0f0f0f_70%)]'
                  : 'bg-[radial-gradient(circle_at_70%_30%,#8b612f,#0f0f0f_70%)]'
                  }`}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-transparent" />

            <div className="container-app absolute inset-0 flex items-center">
              <div className="max-w-xl animate-fade-up">
                <span className="chip bg-gold-500 text-ink-950">Almadi Shop</span>
                <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                  {b.title}
                </h1>
                {b.subtitle && (
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-200 sm:text-base">{b.subtitle}</p>
                )}
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to={b.cta_link || '/boutique'} className="btn-gold">
                    {b.cta_label || 'Découvrir'} <FiArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/boutique?new=1" className="btn border border-white/25 text-white hover:bg-white/10">
                    Voir les nouveautés
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Précédent"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/15 sm:flex">
            <FiChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(1)} aria-label="Suivant"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/15 sm:flex">
            <FiChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)} aria-label={`Diapositive ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-gold-500' : 'w-4 bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------------- Bandeau de réassurance -------------------- */
function TrustBar() {
  const items = [
    { Icon: FiTruck, title: 'Livraison 24 h à Conakry', text: 'Intérieur du pays sous 2 à 5 jours' },
    { Icon: FiShield, title: 'Paiement sécurisé', text: 'Wave, Orange Money, carte ou à la livraison' },
    { Icon: FiRefreshCw, title: 'Échange sous 48 h', text: 'Article non porté, étiquette d’origine' },
    { Icon: FiHeadphones, title: 'Conseil sur WhatsApp', text: 'Du lundi au samedi, 8 h – 20 h' },
  ];
  return (
    <section className="border-b border-ink-100 bg-white">
      <div className="container-app grid gap-px overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 py-5 sm:px-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-950">{title}</p>
              <p className="mt-0.5 text-xs text-ink-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------- Section produits ----------------------- */
function Section({ title, subtitle, icon: Icon, link, linkLabel = 'Tout voir', children, tone = 'white' }) {
  return (
    <section className={tone === 'soft' ? 'bg-ink-50/60 py-12 sm:py-16' : 'py-12 sm:py-16'}>
      <div className="container-app">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2.5">
              {Icon && <Icon className="h-6 w-6 text-gold-500" />}
              {title}
            </h2>
            {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {link && (
            <Link to={link} className="group flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800">
              {linkLabel}
              <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

const Grid = ({ items }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {items.map((p) => <ProductCard key={p.id} product={p} />)}
  </div>
);

/* ------------------------------ Page ------------------------------ */
export default function Home() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { settings } = useShop();

  useEffect(() => {
    api.home().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="container-app py-20 text-center">
        <p className="text-ink-600">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-outline mt-4">Réessayer</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-app space-y-8 py-10">
        <div className="skeleton h-[380px] w-full rounded-2xl" />
        <SkeletonGrid count={10} />
      </div>
    );
  }

  const enabled = Object.entries(settings?.payments || {}).filter(([, v]) => v).map(([k]) => k);
  const seasonLabel = SEASONS[data.seasonal.season]?.label || 'Saison en cours';

  return (
    <>
      <HeroSlider banners={data.banners} />
      <TrustBar />

      {/* Catégories */}
<Section title={t('welcome')} subtitle="Une collection pensée pour chaque saison" link="/boutique">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {data.categories.map((c, i) => (
            <Link
              key={c.id}
              to={`/categorie/${c.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-ink-950 p-6 transition-transform hover:-translate-y-1"
            >
              <div
                className={`absolute inset-0 opacity-90 transition group-hover:opacity-100 ${['bg-gradient-to-br from-gold-700 to-ink-950',
                  'bg-gradient-to-br from-ink-800 to-ink-950',
                  'bg-gradient-to-br from-gold-600 to-gold-900',
                  'bg-gradient-to-br from-ink-900 to-gold-900'][i % 4]
                  }`}
              />
              <div className="relative flex h-full min-h-[120px] flex-col justify-end">
                <h3 className="font-display text-lg font-bold text-white sm:text-xl">{c.name}</h3>
                <p className="mt-1 text-xs text-white/70">{c.productCount} article{c.productCount > 1 ? 's' : ''}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300">
                  Découvrir <FiArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Produits phares */}
      {data.featured.length > 0 && (
        <Section
          title={t('featured')}
          subtitle={t('featured_subtitle')}
          icon={FiZap}
          link="/boutique?featured=1"
          tone="soft"
        >
          <Grid items={data.featured} />
        </Section>
      )}

      {/* Meilleures ventes */}
      {data.bestSellers.length > 0 && (
        <Section
          title={t('best_sellers')}
          subtitle={t('best_sellers_subtitle')}
          icon={FiTrendingUp}
          link="/boutique?sort=popular"
        >
          <Grid items={data.bestSellers} />
        </Section>
      )}

      {/* Bandeau saison */}
      {data.seasonal.items.length > 0 && (
        <Section
          title={`Collection ${seasonLabel}`}
          subtitle="La sélection du moment, renouvelée à chaque saison"
          link={`/boutique?season=${data.seasonal.season}`}
          tone="soft"
        >
          <Grid items={data.seasonal.items} />
        </Section>
      )}

      {/* Nouveautés */}
      {data.newArrivals.length > 0 && (
        <Section title={t('new_arrivals')} subtitle={t('new_arrivals_subtitle')} link="/boutique?new=1">
          <Grid items={data.newArrivals} />
        </Section>
      )}

      {/* Bloc paiement / confiance */}
      <section className="bg-ink-950 py-14">
        <div className="container-app grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Payez comme vous voulez
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
              Wave, Orange Money, carte bancaire, ou en espèces à la réception de votre colis.
              Vous ne réglez la livraison que pour votre zone : les frais s'affichent avant de valider.
            </p>
            <Link to="/page/paiement" className="btn-gold mt-6">
              Comment payer ? <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold-400">Moyens acceptés</p>
            <PaymentLogos methods={enabled} size="lg" />
            <p className="mt-5 text-xs leading-relaxed text-ink-400">
              Aucune donnée bancaire n'est stockée sur nos serveurs. Les paiements mobiles sont
              confirmés par notre équipe avant l'expédition de votre colis.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
