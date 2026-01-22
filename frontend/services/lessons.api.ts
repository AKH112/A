import api from "./api";

export const getLessons = (from: Date, to: Date) => {
  return api.get("/lessons", {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
};

export const createLesson = (data: any) => api.post("/lessons", data);
export const completeLesson = (id: string) => api.post(`/lessons/${id}/complete`);
export const payLesson = (id: string, amount: number) => api.post(`/lessons/${id}/pay`, { amount });
export const deleteLesson = (id: string) => api.delete(`/lessons/${id}`);
