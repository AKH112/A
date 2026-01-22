"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export type AuthUser = {
  id: string;
  email: string;
  tariff?: "FREE" | "EXPERT" | string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  requestOtp: (email: string) => Promise<any>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeUser = (u: any): AuthUser | null => {
  if (!u) return null;
  if (u && typeof u === "object" && "user" in u) {
    return normalizeUser((u as any).user);
  }
  if (typeof u.userId === "string" && typeof u.email === "string") {
    return { id: u.userId, email: u.email, tariff: u.tariff };
  }
  if (typeof u.id === "string" && typeof u.email === "string") {
    return { id: u.id, email: u.email, tariff: u.tariff };
  }
  return null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(normalizeUser(res.data));
    } catch {
      try {
        await api.post("/auth/refresh");
        const res = await api.get("/auth/me");
        setUser(normalizeUser(res.data));
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/auth/login", { email, password });
      setUser(normalizeUser(res.data));
      router.replace("/");
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api.post("/auth/register", { email, password, name });
      setUser(normalizeUser(res.data));
      router.replace("/");
    },
    [router],
  );

  const requestOtp = useCallback(async (email: string) => {
    const res = await api.post("/auth/otp/request", { email });
    return res.data;
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const res = await api.post("/auth/otp/verify", { email, code });
      setUser(normalizeUser(res.data));
      router.replace("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, requestOtp, verifyOtp, logout }),
    [user, loading, login, register, requestOtp, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
