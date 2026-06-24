// client/src/hooks/useRealtimeBeds.ts
import { useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { socketService, BedStatusChangedPayload } from "../services/socket.service";

const ACTION_LABELS: Record<string, string> = {
  allocated: "allocated to a patient",
  discharged: "discharged — now cleaning",
  status_changed: "status updated",
  metadata_updated: "details updated",
  created: "added to inventory",
  deleted: "removed",
};

interface UseRealtimeBedsOptions {
  departmentId?: string;
  onBedStatusChanged?: (payload: BedStatusChangedPayload) => void;
  /** Show toast notifications on every bed event (default true) */
  showToasts?: boolean;
}

export function useRealtimeBeds({
  departmentId,
  onBedStatusChanged,
  showToasts = true,
}: UseRealtimeBedsOptions) {

  const handleBedStatusChanged = useCallback(
    (payload: BedStatusChangedPayload) => {
      if (showToasts) {
        const bedLabel = `Bed ${payload.bed?.bedNumber ?? ""}`;
        const actionLabel = ACTION_LABELS[payload.action] ?? payload.action;

        switch (payload.action) {
          case "allocated":
            toast(`🛏️ ${bedLabel} ${actionLabel}`, {
              duration: 4000,
              style: { background: "#7C3AED", color: "#fff" },
            });
            break;
          case "discharged":
            toast.success(`✅ ${bedLabel} — patient discharged`, { duration: 4000 });
            break;
          case "created":
            toast.success(`➕ ${bedLabel} ${actionLabel}`, { duration: 3000 });
            break;
          case "deleted":
            toast.error(`🗑️ ${bedLabel} ${actionLabel}`, { duration: 3000 });
            break;
          default:
            toast(`🔄 ${bedLabel} ${actionLabel}`, { duration: 3000 });
        }
      }

      onBedStatusChanged?.(payload);
    },
    [onBedStatusChanged, showToasts]
  );

  useEffect(() => {
    if (departmentId) socketService.joinDepartment(departmentId);
    socketService.joinAdminDashboard();

    socketService.on("bed-status-changed", handleBedStatusChanged);

    return () => {
      socketService.off("bed-status-changed", handleBedStatusChanged);
      if (departmentId) socketService.leaveDepartment(departmentId);
    };
  }, [departmentId, handleBedStatusChanged]);
}
