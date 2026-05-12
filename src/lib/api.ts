const BASE_URL = '/api';

const handleResponse = async (res: Response) => {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    if (res.headers.get('content-type')?.includes('text/html') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      console.error('API returned HTML instead of JSON. This often means a 404 or a server error hit the SPA fallback.');
      console.error('URL:', res.url);
      console.error('Status:', res.status);
      data = { error: `Server returned HTML (${res.status}). The requested route might be missing or incorrect.` };
    } else {
      console.error('API Response Parse Error:', e);
      console.log('Raw Response:', text);
      data = { error: 'Failed to parse server response' };
    }
  }

  if (!res.ok) {
    console.error('API Error Response:', { status: res.status, data });
    const error = new Error(data?.error || data?.message || `API request failed with status ${res.status}`);
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
    
    let retires = 3;
    let delay = 1000;
    while (retires > 0) {
      try {
        const res = await fetch(`${BASE_URL}${url}`, { headers });
        return await handleResponse(res);
      } catch (err: any) {
        if (err?.message === 'Failed to fetch' && retires > 1) {
          retires--;
          console.warn(`apiClient.get ${url} failed to fetch, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        console.error(`apiClient.get error for ${url}:`, err);
        throw err;
      }
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
