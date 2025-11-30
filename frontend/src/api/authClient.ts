import api from "./axios";

/**
 * Validate client-side
 */
export const validateLogin = (email: string, password: string) => {
  const errors: { email?: string; password?: string } = {};
  if (!email) errors.email = "Email required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Invalid email";
  if (!password) errors.password = "Password required";
  else if (typeof password === "string" && password.length < 8)
    errors.password = "Password must be >= 8 chars";
  return errors;
};

/**
 * Login: POST credentials, server sets cookies and returns accessToken in JSON,
 * we also store refresh token in localStorage (per your spec).
 */
export const login = async (email: string, password: string) => {
  const errors = validateLogin(email, password);
  if (Object.keys(errors).length) {
    return { success: false, errors };
  }

  try {
    const res = await api.post("/auth/login", { username: email, password });
    // server sets cookies; it also returns accessToken in body
    const accessToken = res.data?.accessToken;
    // server also set refresh_token cookie (non HttpOnly) so client can read it, but per spec we also store refresh in localStorage
    // read cookie:
    const refresh = readCookie("refresh_token");
    if (refresh) localStorage.setItem("refresh_token", refresh);

    if (accessToken) {
      // store access in localStorage now (you requested removing in-memory approach)
      localStorage.setItem("access_token", accessToken);
      return { success: true, accessToken };
    } else {
      return { success: false, message: "No access token returned" };
    }
  } catch (err: any) {
    if (err.response) {
      return {
        success: false,
        message: err.response.data?.message || "Login failed",
        status: err.response.status,
      };
    } else {
      return { success: false, message: "Network error" };
    }
  }
};

export const callRefreshWithLocalStorage = async () => {
  // use refresh token from localStorage per your spec
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token in localStorage");

  // call /refresh with payload
  const res = await api.post("/auth/refresh", { refresh });
  const accessToken = res.data?.accessToken;
  const newRefreshFromCookie = readCookie("refresh_token"); // server sets new cookie
  if (newRefreshFromCookie)
    localStorage.setItem("refresh_token", newRefreshFromCookie);
  if (accessToken) {
    localStorage.setItem("access_token", accessToken);
    // also update cookie (server already set it)
    return accessToken;
  }
  throw new Error("Refresh failed");
};

export const logout = async () => {
  try {
    await api.post("/auth/logout", {
      refresh: localStorage.getItem("refresh_token"),
    });
  } catch (e) {
    // ignore server error
  } finally {
    // cleanup cookies + localStorage
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }
};

/* cookie helpers (simple) */
const readCookie = (name: string) => {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
};
const deleteCookie = (name: string) => {
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
};
