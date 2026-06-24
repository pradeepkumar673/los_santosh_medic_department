// client/src/App.tsx
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import { useAuthStore } from "./store/authStore";
import { useSocketLifecycle } from "./hooks/useSocketLifecycle";

function App() {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useSocketLifecycle();

  return (
    <>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "10px",
            fontSize: "13px",
            maxWidth: "380px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          },
          success: {
            iconTheme: { primary: "#059669", secondary: "#fff" },
            style: { background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" },
          },
          error: {
            iconTheme: { primary: "#DC2626", secondary: "#fff" },
            style: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" },
          },
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
