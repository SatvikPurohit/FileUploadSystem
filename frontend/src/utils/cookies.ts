/**
 * Read a cookie value by name
 * @param name - Cookie name to read
 * @returns Cookie value or null if not found
 */
export function readCookie(name: string): string | null {
  // Get all cookies as a string
  const cookieString = document.cookie;
  
  // If no cookies exist, return null
  if (!cookieString) {
    return null;
  }

  // Split into individual cookies
  const cookies = cookieString.split("; ");
  
  // Find the cookie with the matching name
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  
  return null;
}

/**
 * Get CSRF token from cookie
 * @returns CSRF token or null if not found
 */
export function getCsrfToken(): string | null {
  return readCookie("csrf_token");
}
