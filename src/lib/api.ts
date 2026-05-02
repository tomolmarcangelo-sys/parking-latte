const BASE_URL = '/api';

export const apiClient = {
  get: (url: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => res.json());
  },
  post: (url: string, data: any) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },
  patch: (url: string, data: any) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },
  put: (url: string, data: any) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },
  delete: (url: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => res.json());
  }
};
