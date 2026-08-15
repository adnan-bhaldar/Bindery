import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // sends/receives the httpOnly auth cookie
});

export type AuthUser = { id: string; email: string };

export const signupRequest = (email: string, password: string) =>
  api.post<AuthUser>("/auth/signup", { email, password }).then((r) => r.data);

export const loginRequest = (email: string, password: string) =>
  api.post<AuthUser>("/auth/login", { email, password }).then((r) => r.data);

export const logoutRequest = () => api.post("/auth/logout").then((r) => r.data);

export const meRequest = () => api.get<AuthUser>("/auth/me").then((r) => r.data);

export const getSettingsRequest = () =>
  api.get<{ data: Record<string, unknown>; updatedAt: string }>("/settings").then((r) => r.data);

export const updateSettingsRequest = (data: Record<string, unknown>) =>
  api.put<{ data: Record<string, unknown>; updatedAt: string }>("/settings", { data }).then((r) => r.data);
