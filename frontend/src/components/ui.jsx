import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FiStar, FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiLoader } from 'react-icons/fi';
import { formatPrice } from '../lib/format';

/* ----------------------------- Prix ----------------------------- */
export function Price({ value, compare, currency = 'GNF', size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl sm:text-3xl',
  };
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-bold tracking-tight text-ink-950 ${sizes[size]}`}>
        {formatPrice(value, currency)}
      </span>
      {compare > value && (
        <span className="text-xs font-medium text-ink-400 line-through">
          {formatPrice(compare, currency)}
        </span>
      )}
    </span>
  );
}

/* ---------------------------- Étoiles --------------------------- */
export function Rating({ value = 0, count, size = 'sm', showCount = true }) {
  const px = size === 'lg' ? 18 : size === 'md' ? 15 : 13;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Note : ${value} sur 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <FiStar
            key={n}
            size={px}
            className={n <= Math.round(value) ? 'fill-gold-500 text-gold-500' : 'text-ink-200'}
          />
        ))}
      </span>
      {showCount && (
        <span className="text-xs text-ink-500">
          {count ? `${value} (${count})` : 'Nouveau'}
        </span>
      )}
    </span>
  );
}

/* ---------------------------- Badge ----------------------------- */
export function Badge({ children, tone = 'ink', className = '' }) {
  const tones = {
    ink: 'bg-ink-950 text-white',
    gold: 'bg-gold-500 text-ink-950',
    rose: 'bg-rose-600 text-white',
    emerald: 'bg-emerald-600 text-white',
    soft: 'bg-ink-100 text-ink-700',
  };
  return <span className={`chip ${tones[tone] || tones.ink} ${className}`}>{children}</span>;
}

/* --------------------------- Chargement -------------------------- */
export const Spinner = ({ className = 'h-5 w-5' }) => (
  <FiLoader className={`animate-spin ${className}`} aria-hidden />
);

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-5 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ----------------------------- Vide ------------------------------ */
export function EmptyState({ icon: Icon = FiInfo, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 px-6 py-16 text-center">
      <Icon className="mb-4 h-10 w-10 text-ink-300" />
      <h3 className="font-display text-lg font-semibold text-ink-950">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* --------------------------- Notifications ----------------------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, tone = 'success', duration = 3800) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const value = useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  );

  const icons = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo };
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-ink-200 bg-white text-ink-900',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 shadow-lift ${tones[t.tone]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="opacity-50 transition hover:opacity-100"
                aria-label="Fermer"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
};
