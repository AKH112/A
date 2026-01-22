"use client";

import { useContext } from "react";
import { RoleContext } from "@/providers/RoleProvider";

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("RoleProvider is missing");
  return ctx;
};

