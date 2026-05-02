const BASE_URL = '/api';

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'API request failed');
    (error as any).response = {
      status: res.status,
      data: data
    };
    throw error;
  }
  return data;
};

export const apiClient = {
  get: (url: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(handleResponse);
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
    }).then(handleResponse);
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
    }).then(handleResponse);
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
    }).then(handleResponse);
  },
  delete: (url: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(handleResponse);
  }
};
