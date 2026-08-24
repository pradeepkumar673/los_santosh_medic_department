import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Stethoscope,
  ListChecks,
  BedDouble,
  ClipboardList,
  ShieldPlus,
  Siren,
  FlaskConical,
} from "lucide-react";
import type { UserRole } from "../types/auth.types";

export interface SidebarItem {
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

export const SIDEBAR_ITEMS: Record<UserRole, SidebarItem[]> = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Departments", path: "/admin/departments", icon: ShieldPlus },
    { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
    { label: "Beds", path: "/admin/beds", icon: BedDouble },
    { label: "Appointments", path: "/admin/appointments", icon: CalendarClock },
    { label: "Emergency Command", path: "/emergency", icon: Siren },
    { label: "What-If Simulator", path: "/emergency/simulator", icon: FlaskConical },
  ],
  doctor: [
    { label: "Dashboard", path: "/doctor", icon: LayoutDashboard },
    { label: "My Queue", path: "/doctor/queue", icon: ListChecks },
    { label: "Emergency Command", path: "/emergency", icon: Siren },
    { label: "What-If Simulator", path: "/emergency/simulator", icon: FlaskConical },
  ],
  nurse: [
    { label: "Dashboard", path: "/nurse", icon: LayoutDashboard },
    { label: "Queue", path: "/nurse/queue", icon: ListChecks },
    { label: "Assessments", path: "/nurse/assessments", icon: ClipboardList },
    { label: "Emergency Command", path: "/emergency", icon: Siren },
    { label: "What-If Simulator", path: "/emergency/simulator", icon: FlaskConical },
  ],
  reception: [
    { label: "Dashboard", path: "/reception", icon: LayoutDashboard },
    { label: "Queue", path: "/reception/queue", icon: ListChecks },
    { label: "Appointments", path: "/reception/appointments", icon: CalendarClock },
    { label: "Beds", path: "/reception/beds", icon: BedDouble },
    { label: "Patients", path: "/reception/patients", icon: Users },
    { label: "Emergency Command", path: "/emergency", icon: Siren },
    { label: "What-If Simulator", path: "/emergency/simulator", icon: FlaskConical },
  ],
  patient: [
    { label: "Dashboard", path: "/patient", icon: LayoutDashboard },
    { label: "Book Appointment", path: "/patient/book", icon: CalendarClock },
    { label: "My Appointments", path: "/patient/appointments", icon: ClipboardList },
    { label: "Live Queue", path: "/patient/queue", icon: ListChecks },
    { label: "Medical History", path: "/patient/history", icon: Stethoscope },
  ],
};

export const SIDEBAR_CONFIG = SIDEBAR_ITEMS;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  reception: "Receptionist",
  patient: "Patient",
};

export const ROLE_ACCENT: Record<UserRole, string> = {
  admin: "#9333ea",
  doctor: "#2563eb",
  nurse: "#0d9488",
  reception: "#d97706",
  patient: "#059669",
};

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  reception: "/reception",
  patient: "/patient",
};
