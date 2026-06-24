import {
  LayoutDashboard, CalendarClock, Users, Stethoscope, Bed,
  ClipboardList, Building2, UserCog, ListChecks, Activity, User,
} from "lucide-react";
import type { ComponentType } from "react";
import { UserRole } from "../types/auth.types";

export interface SidebarItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

export const SIDEBAR_CONFIG: Record<UserRole, SidebarItem[]> = {
  patient: [
    { label: "Dashboard", path: "/patient/dashboard", icon: LayoutDashboard },
    { label: "My Appointments", path: "/patient/appointments", icon: CalendarClock },
    { label: "Queue Status", path: "/patient/queue", icon: ListChecks },
    { label: "Profile", path: "/profile", icon: User },
  ],
  doctor: [
    { label: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
    { label: "Live Queue", path: "/doctor/queue", icon: Activity },
    { label: "Appointments", path: "/doctor/appointments", icon: CalendarClock },
    { label: "My Patients", path: "/doctor/patients", icon: Users },
    { label: "Profile", path: "/profile", icon: User },
  ],
  nurse: [
    { label: "Dashboard", path: "/nurse/dashboard", icon: LayoutDashboard },
    { label: "Bed Board", path: "/nurse/beds", icon: Bed },
    { label: "Queue Monitor", path: "/nurse/queue", icon: Activity },
    { label: "Profile", path: "/profile", icon: User },
  ],
  reception: [
    { label: "Dashboard", path: "/reception/dashboard", icon: LayoutDashboard },
    { label: "Appointments", path: "/reception/appointments", icon: CalendarClock },
    { label: "Queue Management", path: "/reception/queue", icon: ListChecks },
    { label: "Bed Board", path: "/reception/beds", icon: Bed },
    { label: "Patients", path: "/reception/patients", icon: Users },
    { label: "Profile", path: "/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Departments", path: "/admin/departments", icon: Building2 },
    { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
    { label: "Staff & Users", path: "/admin/users", icon: UserCog },
    { label: "Patients", path: "/admin/patients", icon: Users },
    { label: "Bed Board", path: "/admin/beds", icon: Bed },
    { label: "Reports", path: "/admin/reports", icon: ClipboardList },
    { label: "Profile", path: "/profile", icon: User },
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: "Patient",
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Front Desk",
  admin: "Administrator",
};

export const ROLE_ACCENT: Record<UserRole, string> = {
  patient: "#0EA5E9",
  doctor: "#14B8A6",
  nurse: "#A855F7",
  reception: "#F59E0B",
  admin: "#EF4444",
};

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  nurse: "/nurse/dashboard",
  reception: "/reception/dashboard",
  admin: "/admin/dashboard",
};
