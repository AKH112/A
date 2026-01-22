import api from "@/services/api";

export const createStudentInvite = (studentId: string) => api.post("/invites/student", { studentId });

export const getStudentInvite = (token: string) => api.get(`/invites/${token}`);

export const acceptStudentInvite = (token: string) => api.post(`/invites/${token}/accept`);

