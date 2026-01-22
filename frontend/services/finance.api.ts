import api from "./api";

export type FinanceSummary = {
  income: number;
  expense: number;
  net: number;
};

export type FinanceTransaction = {
  id: string;
  walletId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  date: string;
  comment?: string | null;
  categoryId?: string | null;
  Wallet?: { id: string; name: string; currency: string };
};

export const getFinanceSummary = (params?: { from?: Date; to?: Date; walletId?: string }) => {
  const from = params?.from ? params.from.toISOString() : undefined;
  const to = params?.to ? params.to.toISOString() : undefined;
  return api.get<FinanceSummary>("/finance/summary", { params: { from, to, walletId: params?.walletId } });
};

export const getFinanceTransactions = (params?: { from?: Date; to?: Date; walletId?: string }) => {
  const from = params?.from ? params.from.toISOString() : undefined;
  const to = params?.to ? params.to.toISOString() : undefined;
  return api.get<FinanceTransaction[]>("/finance/transactions", { params: { from, to, walletId: params?.walletId } });
};

export const addIncome = (data: { walletId: string; amount: number; date?: Date; comment?: string; categoryId?: string | null }) =>
  api.post("/finance/income", {
    ...data,
    date: data.date ? data.date.toISOString() : undefined,
  });

export const addExpense = (data: { walletId: string; amount: number; date?: Date; comment?: string; categoryId?: string | null }) =>
  api.post("/finance/expense", {
    ...data,
    date: data.date ? data.date.toISOString() : undefined,
  });

export const transferMoney = (data: { fromWalletId: string; toWalletId: string; amount: number; date?: Date; comment?: string }) =>
  api.post("/finance/transfer", {
    ...data,
    date: data.date ? data.date.toISOString() : undefined,
  });
