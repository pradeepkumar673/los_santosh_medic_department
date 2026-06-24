// client/src/hooks/useRealtimeAppointments.ts
import { useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  socketService,
  NewAppointmentPayload,
  PatientStatusChangedPayload,
} from "../services/socket.service";

const STATUS_MESSAGES: Record<string, { msg: string; icon: string }> = {
  confirmed:   { msg: "Appointment confirmed",       icon: "✅" },
  cancelled:   { msg: "Appointment cancelled",       icon: "❌" },
  completed:   { msg: "Appointment completed",       icon: "🏁" },
  no_show:     { msg: "Patient marked as no-show",   icon: "⚠️" },
  rescheduled: { msg: "Appointment rescheduled",     icon: "📅" },
};

interface UseRealtimeAppointmentsOptions {
  onNewAppointment?: (payload: NewAppointmentPayload) => void;
  onPatientStatusChanged?: (payload: PatientStatusChangedPayload) => void;
  showToasts?: boolean;
}

export function useRealtimeAppointments({
  onNewAppointment,
  onPatientStatusChanged,
  showToasts = true,
}: UseRealtimeAppointmentsOptions = {}) {

  const handleNewAppointment = useCallback(
    (payload: NewAppointmentPayload) => {
      if (showToasts) {
        const name = payload.patientName ?? "A patient";
        const type = payload.appointmentType
          ? ` (${payload.appointmentType.replace("_", " ")})`
          : "";
        toast(`📋 New appointment booked — ${name}${type}`, {
          duration: 5000,
          style: { background: "#0F172A", color: "#fff", fontWeight: 600 },
          icon: "📅",
        });
      }
      onNewAppointment?.(payload);
    },
    [onNewAppointment, showToasts]
  );

  const handlePatientStatusChanged = useCallback(
    (payload: PatientStatusChangedPayload) => {
      if (showToasts) {
        const { msg, icon } = STATUS_MESSAGES[payload.status] ?? {
          msg: `Status: ${payload.status}`,
          icon: "ℹ️",
        };
        const name = payload.patientName ? ` — ${payload.patientName}` : "";
        const token = payload.tokenNumber ? ` (Token #${payload.tokenNumber})` : "";

        if (payload.status === "cancelled" || payload.status === "no_show") {
          toast.error(`${icon} ${msg}${name}${token}`, { duration: 5000 });
        } else {
          toast.success(`${icon} ${msg}${name}${token}`, { duration: 4000 });
        }
      }
      onPatientStatusChanged?.(payload);
    },
    [onPatientStatusChanged, showToasts]
  );

  useEffect(() => {
    socketService.on("new-appointment", handleNewAppointment);
    socketService.on("patient-status-changed", handlePatientStatusChanged);

    return () => {
      socketService.off("new-appointment", handleNewAppointment);
      socketService.off("patient-status-changed", handlePatientStatusChanged);
    };
  }, [handleNewAppointment, handlePatientStatusChanged]);
}
