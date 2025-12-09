import axios from "axios";

const DEFAULT_API = "http://localhost:4000/api";

function readViteEnvSafe(): string | undefined {
  try {
    const hasImportMeta = eval('typeof import.meta !== "undefined"');
    if (hasImportMeta) {
      // eslint-disable-next-line no-eval
      const env = eval("import.meta.env") as any;
      return env?.VITE_API_BASE;
    }
  } catch {
    // if evalulation fails or import.meta not available -> ignore and fallback
  }
  return undefined;
}

const baseURL =
  readViteEnvSafe() ||
  (typeof process !== "undefined" ? process.env?.VITE_API_BASE : undefined) ||
  DEFAULT_API;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
