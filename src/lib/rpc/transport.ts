import { createConnectTransport } from '@connectrpc/connect-web';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  // Use binary protocol buffers with application/connect+proto content type
  // Connect RPC automatically uses binary format for protocol buffers
  // This ensures efficient binary serialization instead of JSON
  useBinaryFormat: true,
  // Credentials (cookies) are automatically included with fetch for authentication
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});

