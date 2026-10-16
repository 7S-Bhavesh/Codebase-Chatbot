import axios from 'axios';
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl && envUrl.startsWith('http')) {
   
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  

  return '/api';
};

const API_BASE_URL = getApiBaseUrl();
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log(`   Base URL: ${API_BASE_URL}`);
  console.log(`   Backend: ${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}`);
  console.log(`   Mode: ${API_BASE_URL.startsWith('http') ? 'Direct' : 'Proxy'}\n`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.code === 'ECONNREFUSED' || 
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      (!error.response && error.request)
    ) {
      const errorMessage = error.message || 'Network Error';
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      console.error('⚠️ Backend connection error:', errorMessage);
      console.log('💡 Tip: Make sure the backend server is running:');
      console.log(`   Backend URL: ${backendUrl}`);
      console.log('   cd Main-server && npm run dev');
      return Promise.reject({
        message: `Cannot connect to server at ${backendUrl}. Please ensure the backend server is running.`,
        isNetworkError: true,
        originalError: error,
      });
    }

    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const repoAPI = {
  saveRepo: async (email, repo_url) => {
    const response = await api.post('/repo/save-repo', { email, repo_url });
    return response.data;
  },
  getRepo: async (repo_id) => {
    const response = await api.get(`/repo/get-repo/${repo_id}`);
    return response.data;
  },
  getAllRepos: async (email) => {
    const response = await api.get(`/repo/get-all-repos/${email}`);
    return response.data;
  },
  deleteRepo: async (repo_id) => {
    const response = await api.delete(`/repo/delete-repo/${repo_id}`);
    return response.data;
  },
};

export const chatAPI = {
  getChat: async (chat_id) => {
    const response = await api.get(`/chat/get-chat/${chat_id}`);
    return response.data;
  },
  getAllChats: async (repo_id) => {
    const response = await api.get(`/chat/get-all-chats/${repo_id}`);
    return response.data;
  },
};

export const promptAPI = {
  savePrompt: async (chat_id, prompt, repo_id) => {
    const response = await api.post('/prompt/save-prompt', { chat_id, prompt, repo_id });
    return response.data;
  },
  getPrompts: async (chat_id) => {
    const response = await api.get(`/prompt/get-prompts/${chat_id}`);
    return response.data;
  },
  getPromptStatus: async (prompt_id) => {
    const response = await api.get(`/prompt/get-prompt-status/${prompt_id}`);
    return response.data;
  },
};

export default api;

