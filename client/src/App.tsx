import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import { useAuthStore } from "./store/authStore";
import { useSocketLifecycle } from "./hooks/useSocketLifecycle";

function App() {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  // Why: cookies are httpOnly — the only way to know if a session survived
  // a hard refresh is to ask the server, done once before any route renders.
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useSocketLifecycle();

  return (
    <>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
