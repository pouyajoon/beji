/**
 * Authentication is handled via httpOnly secure cookies only
 * Tokens are not accessible to JavaScript for security (XSS protection)
 * Cookies are sent automatically with requests when credentials: 'include' is set
 */
export function getAuthToken(): string | null {
  // Token is stored in httpOnly cookie and cannot be accessed by JavaScript
  // This function is kept for backward compatibility but always returns null
  return null;
}

