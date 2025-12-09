import api from "./axios";
import { tokenStore } from "../tokenStore";

export async function login(email: string, password: string) {
  const res = await api.post(
    "/auth/login",
    { email, password },
    { withCredentials: true }
  );
  const access = res.data?.accessToken;
  if (!access) throw new Error("No access token");
  tokenStore.set(access);
  return access;
}

export async function callRefresh() {
  const res = await api.post("/auth/refresh", {}, { withCredentials: true });
  const access = res.data?.accessToken;
  if (!access) throw new Error("Refresh failed");
  tokenStore.set(access);
  return access;
}

export async function logout() {
  try {
    await api.post("/auth/logout", {}, { withCredentials: true });
  } finally {
    tokenStore.clear();
    window.location.href = "/login";
  }
}
