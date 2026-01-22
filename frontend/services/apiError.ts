import axios from "axios";
import { API_BASE_URL } from "@/services/api";

const getMessageFromResponse = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;

  const maybeMessage = (data as any).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  if (Array.isArray(maybeMessage)) {
    const text = maybeMessage.filter((v) => typeof v === "string").join("\n").trim();
    if (text) return text;
  }

  return null;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;

  if (error.code === "ERR_NETWORK" || !error.response) {
    return `Сервер API недоступен (${API_BASE_URL}). Запустите backend и БД.`;
  }

  const messageFromBody = getMessageFromResponse(error.response.data);
  if (messageFromBody) return messageFromBody;

  const status = error.response.status;
  if (status === 401) return "Неверный email или пароль";
  if (status === 409) return "Пользователь с таким email уже существует";
  if (status === 400) return "Проверьте корректность введённых данных";

  return fallback;
};

