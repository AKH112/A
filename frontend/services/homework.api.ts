import api from "@/services/api";

export const getHomework = (lessonId: string) => api.get(`/homework/lesson/${lessonId}`);

export const createHomework = (lessonId: string, text: string) => api.post("/homework", { lessonId, text });

