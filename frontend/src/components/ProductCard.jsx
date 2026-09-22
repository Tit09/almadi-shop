import { Link } from 'react-router-dom';
import { FiShoppingBag, FiEye } from 'react-icons/fi';
import { mediaUrl } from '../lib/api';
import { useCart } from '../store/useCart';
import { useToast } from './ui';
import { Price, Rating, Badge } from './ui';

export default function ProductCard({ product, compact = false }) {
  const add = useCart((s) => s.add);
  const toast = useToast();

  const out = !product.inStock;
  const low = product.stockState === 'low';

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    add(product, 1);
    toast.success(`« ${product.name} » ajouté au panier`);
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white
                  shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift
                  ${out ? 'opacity-90' : ''}`}
    >
      <Link to={`/produit/${product.slug}`} className="relative block overflow-hidden bg-ink-50">
        <div className="aspect-[4/5] w-full">
          {product.image ? (
            <img
              src={mediaUrl(product.image)}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]
                          ${out ? 'grayscale' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ink-100 text-xs text-ink-400">
              Photo à venir
            </div>
          )}
        </div>

        {/* Pastilles */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.discount > 0 && !out && <Badge tone="rose">−{product.discount} %</Badge>}
          {product.isNew && !out && <Badge tone="gold">Nouveau</Badge>}
          {product.isFeatured && !out && !product.isNew && <Badge tone="ink">Coup de cœur</Badge>}
        </div>

        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-ink-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
              Rupture de stock
            </span>
          </div>
        )}

        {/* Actions rapides (écrans larges) */}
        {!out && (
          <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
            <button onClick={quickAdd} className="btn-gold btn-sm flex-1" type="button">
              <FiShoppingBag className="h-4 w-4" /> Ajouter
            </button>
            <span className="btn-outline btn-sm !px-3" aria-hidden>
              <FiEye className="h-4 w-4" />
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        {product.category && !compact && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">
            {product.category.name}
          </span>
        )}

        <Link
          to={`/produit/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-snug text-ink-950 transition hover:text-gold-600"
        >
          {product.name}
        </Link>

        {!compact && <Rating value={product.rating} count={product.ratingCount} />}

        <div className="mt-auto pt-2">
          <Price value={product.price} compare={product.comparePrice} />
          {low && !out && (
            <p className="mt-1 text-[11px] font-semibold text-amber-600">
              Plus que {product.stock} en stock
            </p>
          )}
          {product.soldCount > 20 && !out && !low && (
            <p className="mt-1 text-[11px] text-ink-400">{product.soldCount} vendus</p>
          )}
        </div>

        {/* Bouton plein écran mobile */}
        <button
          onClick={quickAdd}
          disabled={out}
          type="button"
          className="btn-primary btn-sm mt-2 w-full sm:hidden"
        >
          <FiShoppingBag className="h-3.5 w-3.5" />
          {out ? 'Indisponible' : 'Ajouter'}
        </button>
      </div>
    </article>
  );
}
