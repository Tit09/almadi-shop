import { create } from 'zustand';
import { api } from '../lib/api';

/** Paramètres boutique + catégories : chargés une seule fois au démarrage. */
export const useShop = create((set, get) => ({
  settings: null,
  categories: [],
  zones: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const [settings, categories, zones] = await Promise.all([
        api.settings(),
        api.categories(),
        api.zones(),
      ]);
      set({ settings, categories, zones, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
