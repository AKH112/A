import api from "@/services/api";

export const getTelegramStatus = () => api.get("/telegram/status");

export const createTelegramLinkToken = () => api.post("/telegram/link-token");

export const disconnectTelegram = () => api.post("/telegram/disconnect");

export const sendTelegramTest = (text?: string) => api.post("/telegram/test", { text });

