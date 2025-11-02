import { createConnectTransport } from '@connectrpc/connect-web';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  // Use binary protocol buffers (Connect uses application/connect+proto by default)
  // Credentials (cookies) are automatically included with fetch
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});

