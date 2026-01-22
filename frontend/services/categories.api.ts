import api from "./api";

export type Category = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  name: string;
  color?: string;
};

export const getCategories = async () => {
  return api.get<Category[]>("/categories");
};

export const createCategory = async (data: { type: 'INCOME' | 'EXPENSE'; name: string; color?: string }) => {
  return api.post<Category>("/categories", data);
};

export const deleteCategory = async (id: string) => {
  return api.delete(`/categories/${id}`);
};
