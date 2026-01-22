import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (typeof window === "undefined") throw error;
    const status = error?.response?.status;
    const original = error?.config as any;
    if (!original) throw error;

    const url = String(original.url ?? "");
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    if (status !== 401 || original.__secrepRetried || isAuthEndpoint) throw error;
    original.__secrepRetried = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient.post("/auth/refresh").then(() => undefined);
      }
      await refreshPromise;
      return api.request(original);
    } catch (e) {
      throw e;
    } finally {
      refreshPromise = null;
    }
  },
);

export default api;
