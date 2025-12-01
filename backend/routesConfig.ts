// routes/index.ts
import authRoute from "./routes/auth";
import uploadRoute from "./routes/upload";
// import other routes here, e.g. import otherRoutes from './other';

function normalizeRoute<T>(r: T | T[] | undefined): T[] {
  if (!r) return [];
  return Array.isArray(r) ? r : [r];
}

export default function getRoutes() {
  // Collect routes from files and flatten them
  const all = [
    ...normalizeRoute(authRoute),
    ...normalizeRoute(uploadRoute),
  ];

  return all;
}