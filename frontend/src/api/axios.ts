import axios from "axios";

const DEFAULT_API = "http://localhost:4000/api";

/**
 * Resolve API base URL in a way that:
 * - Avoids using 'import.meta' literal (so file can be parsed by CommonJS/test tools)
 * - Works in Vite builds (we'll inject globalThis.__VITE_API_BASE__ via vite.config)
 * - Works in Node/test by falling back to process.env.VITE_API_BASE
 */
function resolveBaseUrl(): string {
  // 1) prefer process.env (useful for Node, CI, tests)
  if (
    typeof process !== "undefined" &&
    typeof (process.env as any).VITE_API_BASE === "string" &&
    (process.env as any).VITE_API_BASE.trim() !== ""
  ) {
    return (process.env as any).VITE_API_BASE;
  }

  // 2) then prefer a build-time injected global (we will set this in vite.config)
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as any).__VITE_API_BASE__
  ) {
    return (globalThis as any).__VITE_API_BASE__;
  }

  // 3) final fallback
  return DEFAULT_API;
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
});

export default api;
