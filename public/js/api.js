// api endpoint for server
const API = (() => {
  const BASE_URL = '/api';

  // token storage
  function getToken() {
    return localStorage.getItem('token');
  }

  // network req
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (token && endpoint !== '/auth/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
          }
        }
        throw new Error(data.error || 'Network request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  return {
    login: async (username, password) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { username, password }
      });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      return res;
    },

    register: async (username, password, role = 'user') => {
      return request('/auth/register', {
        method: 'POST',
        body: { username, password, role }
      });
    },

    getCurrentUser: () => {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    getUsers: async () => {
      return request('/users');
    },

    deleteUser: async (id) => {
      return request(`/users/${id}`, {
        method: 'DELETE'
      });
    },

    getInventory: async () => {
      return request('/inventory');
    },

    getItem: async (id) => {
      return request(`/inventory/${id}`);
    },

    addItem: async (itemData) => {
      return request('/inventory', {
        method: 'POST',
        body: itemData
      });
    },

    updateItem: async (id, itemData) => {
      return request(`/inventory/${id}`, {
        method: 'PUT',
        body: itemData
      });
    },

    deleteItem: async (id) => {
      return request(`/inventory/${id}`, {
        method: 'DELETE'
      });
    },

    getTransactions: async () => {
      return request('/transactions');
    },

    recordTransaction: async (itemId, type, quantity, notes = "") => {
      return request('/transactions', {
        method: 'POST',
        body: { itemId, type, quantity, notes }
      });
    },

    getDashboardStats: async () => {
      return request('/analytics/dashboard');
    },

    getProjections: async (windowDays = 30) => {
      return request(`/analytics/depletion?days=${windowDays}`);
    }
  };
})();
