import { Platform } from 'react-native';
import useAuthStore from '../store/authStore';
import { API_URL } from '../constants';

// Single in-flight refresh shared by all concurrent 401s.
let refreshPromise = null;

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const url = `${API_URL}/auth/refresh`;
      const body = JSON.stringify({ refreshToken });
      console.log('──────── API REFRESH REQUEST ────────');
      console.log(`POST ${url}`);
      console.log('Headers:', JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      console.log('Body:', body);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      console.log(`──────── API REFRESH RESPONSE (${res.status}) ────────`);
      const text = await res.text();
      console.log('Response Body:', text);
      console.log('────────────────────────────────');

      if (!res.ok) return null;
      const data = text ? JSON.parse(text) : null;
      if (!data?.token) return null;
      useAuthStore.getState().setAuth(data.token, useAuthStore.getState().user, data.refreshToken);
      return data.token;
    } catch (e) {
      console.log('[API REFRESH ERROR]', e.message);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiFetch(path, options = {}, _retry = false) {
  const token = useAuthStore.getState().token;

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_URL}${path}`;
  console.log('──────── API REQUEST ────────');
  console.log(`${options.method || 'GET'} ${url}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  if (options.body) {
    if (options.body instanceof FormData) {
      console.log('Body: [FormData]');
    } else {
      console.log('Body:', options.body);
    }
  }

  const res = await fetch(url, { ...options, headers });

  console.log(`──────── API RESPONSE (${res.status}) ────────`);
  console.log(`URL: ${url}`);

  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh');

  if (res.status === 401 && !isAuthEndpoint) {
    if (!_retry && !(options.body instanceof FormData)) {
      const newToken = await refreshSession();
      if (newToken) return apiFetch(path, options, true);
    }
    useAuthStore.getState().clearAuth();
    throw new Error('Session expired. Please log in again.');
  }

  if (res.status === 204) {
    console.log('Response Body: [204 No Content]');
    console.log('────────────────────────────────');
    return null;
  }

  let data;
  try {
    const text = await res.text();
    console.log('Response Body:', text);
    console.log('────────────────────────────────');
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    console.log('[API JSON PARSE ERROR]', e.message);
    console.log('────────────────────────────────');
    throw new Error(`Request failed (${res.status}) - Invalid JSON response`);
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const register = (payload) =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getMe = () => apiFetch('/auth/me');

export const updateMe = (payload) =>
  apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updatePushToken = (fcmToken) =>
  apiFetch('/auth/push-token', {
    method: 'PATCH',
    body: JSON.stringify({ fcmToken }),
  });

// Pass the still-valid access token explicitly: sign-out clears the auth
// store before the request lands, so reading the token from the store would
// be too late and the server session would never be revoked.
export const logout = (token) =>
  apiFetch('/auth/logout', {
    method: 'POST',
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  }).catch(() => { });

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/products${query ? `?${query}` : ''}`);
};

export const getProduct = (id) => apiFetch(`/products/${id}`);

export const createProduct = (payload) =>
  apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProduct = (id, payload) =>
  apiFetch(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const publishProduct = (id) =>
  apiFetch(`/products/${id}/publish`, { method: 'POST' });

export const unpublishProduct = (id) =>
  apiFetch(`/products/${id}/unpublish`, { method: 'POST' });

export const deleteProduct = (id) =>
  apiFetch(`/products/${id}`, { method: 'DELETE' });

export const addProductImage = (productId, payload) =>
  apiFetch(`/products/${productId}/images`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteProductImage = (productId, imageId) =>
  apiFetch(`/products/${productId}/images/${imageId}`, { method: 'DELETE' });

// ─── Variants ────────────────────────────────────────────────────────────────

export const getVariants = (productId) =>
  apiFetch(`/variants/product/${productId}`);

export const createVariant = (payload) =>
  apiFetch('/variants', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const bulkUpdateVariants = (productId, variants) =>
  apiFetch(`/variants/product/${productId}/bulk`, {
    method: 'PUT',
    body: JSON.stringify({ variants }),
  });

export const updateVariant = (id, payload) =>
  apiFetch(`/variants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteVariant = (id) =>
  apiFetch(`/variants/${id}`, { method: 'DELETE' });

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = () => apiFetch('/categories');

export const createCategory = (formData) =>
  apiFetch('/categories', { method: 'POST', body: formData, headers: {} });

export const updateCategory = (id, formData) =>
  apiFetch(`/categories/${id}`, { method: 'PATCH', body: formData, headers: {} });

export const deleteCategory = (id) =>
  apiFetch(`/categories/${id}`, { method: 'DELETE' });

// ─── Orders ───────────────────────────────────────────────────────────────────

export const getOrders = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/orders${query ? `?${query}` : ''}`);
};

export const getOrder = (id) => apiFetch(`/orders/${id}`);

export const updateOrderStatus = (id, status) =>
  apiFetch(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ─── Shiprocket shipments ────────────────────────────────────────────────────

export const checkShipmentServiceability = (orderId, body = {}) =>
  apiFetch('/shipments/serviceability', {
    method: 'POST',
    body: JSON.stringify({ orderId, ...body }),
  });

export const createShipment = (orderId, body) =>
  apiFetch('/shipments/create', {
    method: 'POST',
    body: JSON.stringify({ orderId, ...body }),
  });

export const getShipmentLabel = (orderId) =>
  apiFetch(`/shipments/${orderId}/label`, { method: 'POST', body: '{}' });

export const getShipmentInvoice = (orderId) =>
  apiFetch(`/shipments/${orderId}/invoice`, { method: 'POST', body: '{}' });

export const getShipmentManifest = (orderId) =>
  apiFetch(`/shipments/${orderId}/manifest`, { method: 'POST', body: '{}' });

export const trackShipment = (orderId) => apiFetch(`/shipments/${orderId}/track`);

export const cancelShipment = (orderId) =>
  apiFetch(`/shipments/${orderId}/cancel`, { method: 'POST', body: '{}' });

// ─── Employees ───────────────────────────────────────────────────────────────

export const getEmployees = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/employees${query ? `?${query}` : ''}`);
};

export const approveEmployee = (id, action) =>
  apiFetch(`/employees/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const deleteEmployee = (id) =>
  apiFetch(`/employees/${id}`, { method: 'DELETE' });

// ─── Users (admin) ────────────────────────────────────────────────────────────

export const getUsers = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/users${query ? `?${query}` : ''}`);
};

export const getCustomers = (params = {}) => getUsers({ ...params, role: 'customer' });

export const getUser = (id) => apiFetch(`/users/${id}`);

export const createUser = (payload) =>
  apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) });

export const deleteUser = (id) =>
  apiFetch(`/users/${id}`, { method: 'DELETE' });

export const resetUserPassword = (id, password) =>
  apiFetch(`/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });

export const setUserActive = (id, active) =>
  apiFetch(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const getCoupons = () => apiFetch('/coupons');

export const createCoupon = (payload) =>
  apiFetch('/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCoupon = (id, payload) =>
  apiFetch(`/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getDashboard = () => apiFetch('/analytics/dashboard');
export const getSales = () => apiFetch('/analytics/sales');
export const getInventory = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/analytics/inventory${query ? `?${query}` : ''}`);
};
export const getCategorySales = () => apiFetch('/analytics/category-sales');
export const getEmployeePerformance = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/analytics/employee-performance${query ? `?${query}` : ''}`);
};
export const getSalesSummary = () => apiFetch('/analytics/sales-summary');
export const getCategoryInventory = () => apiFetch('/analytics/category-inventory');

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadImage = async (source, bucket = 'product-images') => {
  const formData = new FormData();

  if (Platform.OS === 'web' && source && typeof source === 'object' && source.file) {
    const file = source.file;
    const filename = source.name || file.name || `upload-${Date.now()}.jpg`;
    formData.append('file', file, filename);
  } else {
    const uri = typeof source === 'string' ? source : source?.uri;
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    formData.append('file', { uri, name: filename, type });
  }

  formData.append('bucket', bucket);

  return apiFetch('/upload/image', { method: 'POST', body: formData });
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const generateContent = (payload) =>
  apiFetch('/ai/generate-content', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Gemini "nano banana" image generation. Pass a local `uri` (sends the file)
// or an `imageUrl` (server fetches it). Returns { url } of the generated image.
export const generateProductImage = ({ uri, imageUrl, imageUrls, productType, color, category }) => {
  if (uri) {
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const formData = new FormData();
    formData.append('image', { uri, name: filename, type });
    if (productType) formData.append('productType', productType);
    if (color) formData.append('color', color);
    if (category) formData.append('category', category);
    return apiFetch('/ai/generate-image', { method: 'POST', body: formData });
  }
  return apiFetch('/ai/generate-image', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, imageUrls, productType, color, category }),
  });
};

// ─── Sales (offline / mark-as-sold) ───────────────────────────────────────────

export const recordSale = (payload) =>
  apiFetch('/sales', { method: 'POST', body: JSON.stringify(payload) });

export const getOfflineSales = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, v));
  const query = qs.toString();
  return apiFetch(`/sales${query ? `?${query}` : ''}`);
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = () => apiFetch('/notifications');

export const markNotificationsRead = (ids) =>
  apiFetch('/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });

export const markAllNotificationsRead = () =>
  apiFetch('/notifications/mark-all-read', { method: 'POST' });
