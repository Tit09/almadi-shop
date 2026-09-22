import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Panier persistant (localStorage).
 * Le prix stocké ici ne sert qu'à l'affichage : le serveur recalcule
 * systématiquement le montant réel à la validation de la commande.
 */
const lineKey = (productId, variant) => `${productId}::${variant || ''}`;

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      add: (product, quantity = 1, variant = null) => {
        const key = lineKey(product.id, variant);
        const items = [...get().items];
        const found = items.find((i) => i.key === key);
        const max = product.trackStock ? product.stock : 99;

        if (found) {
          found.quantity = Math.min(found.quantity + quantity, max);
        } else {
          items.push({
            key,
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            comparePrice: product.comparePrice,
            image: product.image,
            variant,
            quantity: Math.min(quantity, max),
            maxStock: max,
          });
        }
        set({ items, isOpen: true });
      },

      setQuantity: (key, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.key === key
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock || 99)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),

      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [], isOpen: false }),

      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.quantity, 0),
      savings: () =>
        get().items.reduce(
          (n, i) => n + (i.comparePrice && i.comparePrice > i.price ? (i.comparePrice - i.price) * i.quantity : 0),
          0
        ),
    }),
    {
      name: 'almadi_cart',
      version: 1,
      // Seuls les articles sont mémorisés : le tiroir ne doit jamais
      // se rouvrir tout seul au rechargement de la page.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
