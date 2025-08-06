// Configuration for API endpoints
export const API_CONFIG = {
  // In development, use the Vite proxy
  // In production, use the Railway backend URL
  baseURL: import.meta.env.PROD 
    ? import.meta.env.VITE_API_BASE_URL || 'https://your-railway-url.up.railway.app'
    : '', // Empty string means use relative URLs (proxy)
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  if (API_CONFIG.baseURL) {
    return `${API_CONFIG.baseURL}${endpoint}`;
  }
  return endpoint; // Use relative URL for proxy
};
