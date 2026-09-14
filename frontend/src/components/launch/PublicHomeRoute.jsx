import Loader from "../ui/Loader.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { RoleRedirect } from "../../routes/routeGuards.jsx";
import LandingPage from "../../pages/LandingPage.jsx";
import LaunchPage from "./LaunchPage.jsx";

const launchMode = import.meta.env.VITE_LAUNCH_MODE === "true";

export default function PublicHomeRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  if (!initialized) return <Loader label="Loading MonoPrep..." />;
  if (user) return <RoleRedirect />;
  return launchMode ? <LaunchPage /> : <LandingPage />;
}

