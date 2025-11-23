import { createConnectTransport } from '@connectrpc/connect-web';
import { getAuthToken } from '../auth/token';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  // Use binary protocol buffers with application/connect+proto content type
  // Connect RPC automatically uses binary format for protocol buffers
  // This ensures efficient binary serialization instead of JSON
  useBinaryFormat: true,
  // Send Bearer token in Authorization header
  fetch: (input, init) => {
    const token = getAuthToken();
    const headers = new Headers(init?.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return fetch(input, {
      ...init,
      headers,
      credentials: 'include', // Still include cookies for backward compatibility
    });
  },
});

