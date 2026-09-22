import { create } from 'zustand';
import { api, getToken, setToken } from '../lib/api';

/** Session client / administrateur. Le jeton JWT vit dans localStorage. */
export const useAuth = create((set) => ({
  user: null,
  ready: false,

  bootstrap: async () => {
    if (!getToken()) return set({ ready: true });
    try {
      const { user } = await api.me();
      set({ user, ready: true });
    } catch {
      setToken(null);
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    setToken(token);
    set({ user });
    return user;
  },

  register: async (payload) => {
    const { token, user } = await api.register(payload);
    setToken(token);
    set({ user });
    return user;
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));
