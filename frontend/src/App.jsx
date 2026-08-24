import { Suspense } from "react";
import { useLocation } from "react-router-dom";
import Loader from "./components/ui/Loader.jsx";
import { useAuthBootstrap } from "./hooks/useAuth.js";
import AppRoutes from "./routes/AppRoutes.jsx";
import { useAuthStore } from "./store/authStore.js";

export default function App() {
  useAuthBootstrap();
  const initialized = useAuthStore((state) => state.initialized);
  const { pathname } = useLocation();
  const isPublicRoute = [
    "/",
    "/products",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ].includes(pathname);

  if (!initialized && !isPublicRoute) {
    return <Loader label="Loading your workspace..." />;
  }

  return (
    <Suspense fallback={<Loader label="Loading your workspace..." />}>
      <AppRoutes />
    </Suspense>
  );
}
