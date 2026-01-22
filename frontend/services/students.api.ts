import api from "./api";

export const getStudents = () => api.get("/students");
export const createStudent = (data: any) => api.post("/students", data);
export const getStudent = (id: string) => api.get(`/students/${id}`);
