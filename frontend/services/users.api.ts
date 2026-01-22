import api from "@/services/api";

export const getMe = () => api.get("/users/me");

export const updateMe = (patch: { timezone: string }) => api.patch("/users/me", patch);

export const getMyTeachers = () => api.get("/users/me/teachers");

export const deleteMyTeacher = (teacherId: string) => api.delete(`/users/me/teachers/${teacherId}`);

export const getTeacherHomework = (
  teacherId: string,
  params?: { from?: string; to?: string; status?: "ASSIGNED" | "DONE" },
) => api.get(`/users/me/teachers/${teacherId}/homework`, { params });
