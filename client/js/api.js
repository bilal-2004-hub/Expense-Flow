/* =========================================================
   EXPENSEFLOW — api.js
   Centralized REST API client for backend communication.
   Automatically attaches Firebase ID Tokens in Authorization header.
   ========================================================= */

const API = (() => {
  const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : '/api';

  async function getToken() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
        return await firebase.auth().currentUser.getIdToken();
      }
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID Token:', e);
    }
    return localStorage.getItem('ef_id_token') || null;
  }

  async function request(endpoint, options = {}) {
    const token = await getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API Error (${response.status})`);
      }

      return data;
    } catch (err) {
      console.error(`API Request failed [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  return {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
    BASE_URL
  };
})();
