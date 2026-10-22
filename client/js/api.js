/* =========================================================
   EXPENSEFLOW — api.js
   Centralized REST API client for backend communication.
   Automatically attaches Firebase ID Tokens in Authorization header.
   ========================================================= */

const API = (() => {
  // Resolve base URL for API calls
  const isLocalEnv =
    !window.location.hostname ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.protocol === 'file:';

  const BASE_URL = window.location.port === '5001'
    ? '/api'
    : isLocalEnv
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

      let data = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          data = null;
        }
      }

      if (!response.ok) {
        let errorMsg = data && data.message;
        if (!errorMsg) {
          if (response.status === 404) {
            errorMsg = `API endpoint not found (${endpoint}). Please make sure the backend server is running on port 5001.`;
          } else if (response.status === 500) {
            errorMsg = 'Internal server error. Please check backend server logs.';
          } else {
            errorMsg = `Server error (${response.status} ${response.statusText || ''})`.trim();
          }
        }
        throw new Error(errorMsg);
      }

      if (data === null) {
        const text = await response.text();
        return { text };
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        const networkError = new Error('Cannot connect to backend server. Please make sure the server is running on port 5001 (npm start in server folder).');
        console.error(`API Request failed [${options.method || 'GET'} ${endpoint}]:`, networkError);
        throw networkError;
      }
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
