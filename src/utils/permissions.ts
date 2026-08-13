import type { AppRole } from "../services/authService";

export const isControlTowerRole = (role: AppRole) => role === "ADMIN" || role === "MANAGER";
export const isSiteAdmin = (role: AppRole) => role === "ADMIN";

