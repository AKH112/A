"use client";

import { createContext, useCallback, useMemo, useSyncExternalStore } from "react";

export type AppRole = "Ученик" | "Учитель";

type RoleContextValue = {
  role: AppRole;
  setRole: (role: AppRole) => void;
};

export const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "sidebar:role";
const CHANGE_EVENT = "sidebar:role:change";
const DEFAULT_ROLE: AppRole = "Учитель";

const readRole = (): AppRole => {
  if (typeof window === "undefined") return DEFAULT_ROLE;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "Учитель" || saved === "Ученик" ? saved : DEFAULT_ROLE;
};

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const role = useSyncExternalStore<AppRole>(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener(CHANGE_EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(CHANGE_EVENT, handler);
      };
    },
    readRole,
    () => DEFAULT_ROLE,
  );

  const setRole = useCallback((next: AppRole) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
