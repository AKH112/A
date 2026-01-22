import api from "@/services/api";

export const requestEmailOtp = (email: string) => api.post("/auth/otp/request", { email });

export const verifyEmailOtp = (email: string, code: string) => api.post("/auth/otp/verify", { email, code });

