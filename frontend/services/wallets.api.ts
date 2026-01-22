import api from "./api";

export type Wallet = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  isFavorite: boolean;
  isArchived: boolean;
};

export const getWallets = () => api.get<Wallet[]>("/wallets");
export const createWallet = (data: { name: string; currency?: string }) => api.post<Wallet>("/wallets", data);
export const updateWallet = (id: string, data: Partial<Pick<Wallet, "name" | "isFavorite" | "isArchived">>) =>
  api.patch<Wallet>(`/wallets/${id}`, data);

