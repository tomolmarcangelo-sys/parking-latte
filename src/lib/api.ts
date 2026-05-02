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
  get: async (url: string) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch(`${BASE_URL}${url}`, { headers });
      return handleResponse(res);
    } catch (err) {
      console.error(`apiClient.get error for ${url}:`, err);
      throw err;
    }
  },
  post: async (url: string, data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    } catch (err) {
      console.error(`apiClient.post error for ${url}:`, err);
      throw err;
    }
  },
  patch: async (url: string, data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    } catch (err) {
      console.error(`apiClient.patch error for ${url}:`, err);
      throw err;
    }
  },
  put: async (url: string, data: any) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    } catch (err) {
      console.error(`apiClient.put error for ${url}:`, err);
      throw err;
    }
  },
  delete: async (url: string) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
      });
      return handleResponse(res);
    } catch (err) {
      console.error(`apiClient.delete error for ${url}:`, err);
      throw err;
    }
  }
};
