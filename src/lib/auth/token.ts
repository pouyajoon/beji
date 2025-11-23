/**
 * Get the authentication token from cookies
 * This is a helper function to extract the token from the cookie string
 */
export function getAuthTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Get the authentication token from localStorage (if stored there)
 */
export function getAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get the authentication token (checks cookie first, then localStorage)
 */
export function getAuthToken(): string | null {
  return getAuthTokenFromCookie() || getAuthTokenFromStorage();
}

