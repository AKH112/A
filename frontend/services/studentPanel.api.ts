import api from "@/services/api";

export const updateStudent = (id: string, patch: any) => api.patch(`/students/${id}`, patch);

export const getStudentBalanceEvents = (id: string, params?: { from?: string; to?: string }) =>
  api.get(`/students/${id}/balance-events`, { params });

export const deleteStudentBalanceEvent = (id: string, eventId: string) => api.delete(`/students/${id}/balance-events/${eventId}`);

export const createStudentPayment = (id: string, body: { walletId: string; amount: number; happenedAt?: string; note?: string }) =>
  api.post(`/students/${id}/payments`, body);

export const getStudentSubscriptions = (id: string, includeFinished?: boolean) =>
  api.get(`/students/${id}/subscriptions`, { params: includeFinished ? { includeFinished: "1" } : undefined });

export const createStudentSubscription = (id: string, body: { title: string; lessonsTotal: number; price?: number }) =>
  api.post(`/students/${id}/subscriptions`, body);

export const finishStudentSubscription = (id: string, subscriptionId: string) =>
  api.patch(`/students/${id}/subscriptions/${subscriptionId}/finish`, {});

export const listHomeworkTemplates = () => api.get("/students/homework/templates");

export const createHomeworkTemplate = (body: { title: string; text: string }) => api.post("/students/homework/templates", body);

export const deleteHomeworkTemplate = (templateId: string) => api.delete(`/students/homework/templates/${templateId}`);

export const getStudentHomeworkTasks = (
  id: string,
  params?: { from?: string; to?: string; status?: "ASSIGNED" | "DONE" },
) => api.get(`/students/${id}/homework`, { params });

export const createStudentHomeworkTask = (id: string, body: { title: string; text: string; templateId?: string; dueAt?: string }) =>
  api.post(`/students/${id}/homework`, body);

export const updateStudentHomeworkTask = (id: string, taskId: string, patch: any) => api.patch(`/students/${id}/homework/${taskId}`, patch);

export const deleteStudentHomeworkTask = (id: string, taskId: string) => api.delete(`/students/${id}/homework/${taskId}`);

