export type UserRole = "patient" | "doctor" | "reception" | "admin" | "nurse";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isActive?: boolean;
  isVerified?: boolean;
  lastLogin?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
