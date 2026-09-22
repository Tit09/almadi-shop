// Client HTTP unique de l'application.
// En développement, Vite relaie /api vers http://localhost:4000 (voir vite.config.js).
// En production, définir VITE_API_URL si l'API est sur un autre domaine.

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'almadi_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* navigation privée : on continue sans persistance */
  }
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      Accept: 'application/json',
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) opts.body = raw ? body : JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, opts);
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre réseau.', 0);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new ApiError(
      (data && data.error) || `Erreur ${res.status}`,
      res.status,
      data && data.details
    );
  }
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

/* ---------------------------- Boutique ---------------------------- */
export const api = {
  settings: () => request('/settings'),
  home: () => request('/home'),
  categories: () => request('/categories'),
  banners: () => request('/banners'),
  zones: () => request('/delivery-zones'),
  products: (params) => request(`/products${qs(params)}`),
  product: (slug) => request(`/products/${slug}`),
  suggest: (q) => request(`/suggest${qs({ q })}`),
  review: (body) => request('/reviews', { method: 'POST', body }),
  newsletter: (email) => request('/newsletter', { method: 'POST', body: { email } }),
  validateCoupon: (code, subtotal) =>
    request('/coupons/validate', { method: 'POST', body: { code, subtotal } }),

  /* ------------------------- Commandes ---------------------------- */
  createOrder: (body) => request('/orders', { method: 'POST', body }),
  trackOrder: (number, phone) => request(`/orders/track${qs({ number, phone })}`),
  myOrders: () => request('/orders/mine'),

  /* ----------------------------- Compte --------------------------- */
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: () => request('/auth/me'),
  changePassword: (current, next) =>
    request('/auth/password', { method: 'POST', body: { current, next } }),
};

/* ------------------------- Administration ------------------------- */
export const adminApi = {
  stats: () => request('/admin/stats'),

  products: (params) => request(`/admin/products${qs(params)}`),
  product: (id) => request(`/admin/products/${id}`),
  createProduct: (body) => request('/admin/products', { method: 'POST', body }),
  updateProduct: (id, body) => request(`/admin/products/${id}`, { method: 'PUT', body }),
  patchProduct: (id, body) => request(`/admin/products/${id}`, { method: 'PATCH', body }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  categories: () => request('/admin/categories'),
  createCategory: (body) => request('/admin/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/admin/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

  orders: (params) => request(`/admin/orders${qs(params)}`),
  order: (id) => request(`/admin/orders/${id}`),
  updateOrder: (id, body) => request(`/admin/orders/${id}`, { method: 'PATCH', body }),

  customers: () => request('/admin/customers'),
  guests: () => request('/admin/guests'),

  reviews: () => request('/admin/reviews'),
  patchReview: (id, body) => request(`/admin/reviews/${id}`, { method: 'PATCH', body }),
  deleteReview: (id) => request(`/admin/reviews/${id}`, { method: 'DELETE' }),

  zones: () => request('/admin/delivery-zones'),
  createZone: (body) => request('/admin/delivery-zones', { method: 'POST', body }),
  updateZone: (id, body) => request(`/admin/delivery-zones/${id}`, { method: 'PUT', body }),
  deleteZone: (id) => request(`/admin/delivery-zones/${id}`, { method: 'DELETE' }),

  coupons: () => request('/admin/coupons'),
  createCoupon: (body) => request('/admin/coupons', { method: 'POST', body }),
  patchCoupon: (id, body) => request(`/admin/coupons/${id}`, { method: 'PATCH', body }),
  deleteCoupon: (id) => request(`/admin/coupons/${id}`, { method: 'DELETE' }),

  banners: () => request('/admin/banners'),
  createBanner: (body) => request('/admin/banners', { method: 'POST', body }),
  updateBanner: (id, body) => request(`/admin/banners/${id}`, { method: 'PUT', body }),
  deleteBanner: (id) => request(`/admin/banners/${id}`, { method: 'DELETE' }),

  settings: () => request('/admin/settings'),
  saveSettings: (body) => request('/admin/settings', { method: 'PUT', body }),
  adminPassword: (current, next) =>
    request('/admin/password', { method: 'POST', body: { current, next } }),

  upload: (files) => {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('images', f));
    return request('/admin/upload', { method: 'POST', body: form, raw: true });
  },
};

export const mediaUrl = (path) => (!path ? null : path.startsWith('http') ? path : `${BASE}${path}`);
