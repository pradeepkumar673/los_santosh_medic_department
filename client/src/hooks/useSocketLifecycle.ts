import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../services/socket.service";
import toast from "react-hot-toast";
import { useEmergencyStore } from "../store/emergencyStore";

export function useSocketLifecycle() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();

      // Standard Queue / Bed Listeners (kept intact)
      // These are typically managed inside individual hooks like useRealtimeQueue, 
      // but global lifecycle connection is maintained here.

      // EmergencyFlow AI Real-time Listeners
      const handleIncidentCreated = () => {
        toast("🚨 New emergency incident reported!", {
          icon: "🚨",
          style: { background: "#FEF2F2", color: "#991B1B", fontWeight: 600, border: "1px solid #FECACA" },
          duration: 6000,
        });
        useEmergencyStore.getState().loadIncidents();
      };

      const handleIncidentUpdated = () => {
        useEmergencyStore.getState().loadIncidents();
      };

      const handleResourceChanged = (payload: any) => {
        if (payload.resource?.type === "ventilator") {
          useEmergencyStore.getState().loadResources(undefined, "ventilator");
          useEmergencyStore.getState().loadHospitals(); // Refresh network stats
        }
      };

      const handleRecommendationUpdated = () => {
        useEmergencyStore.getState().loadRecommendations();
      };

      const handleShortageAlert = (payload: any) => {
        toast.error(`⚠️ ${payload.riskLevel} ventilator shortage risk detected!`, {
          duration: 8000,
          icon: "⚠️",
          style: { background: "#FEF2F2", color: "#991B1B", fontWeight: 600, border: "1px solid #FECACA" },
        });
      };

      socketService.on("incident-created", handleIncidentCreated);
      socketService.on("incident-updated", handleIncidentUpdated);
      socketService.on("resource-status-changed", handleResourceChanged);
      socketService.on("recommendation-updated", handleRecommendationUpdated);
      socketService.on("shortage-alert", handleShortageAlert);

      return () => {
        socketService.off("incident-created", handleIncidentCreated);
        socketService.off("incident-updated", handleIncidentUpdated);
        socketService.off("resource-status-changed", handleResourceChanged);
        socketService.off("recommendation-updated", handleRecommendationUpdated);
        socketService.off("shortage-alert", handleShortageAlert);
        socketService.disconnect();
      };
    } else {
      socketService.disconnect();
      return () => socketService.disconnect();
    }
  }, [isAuthenticated, user]);
}
