import { useCallback, useState } from "react";
import Loader from "../ui/Loader.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { RoleRedirect } from "../../routes/routeGuards.jsx";
import LandingPage from "../../pages/LandingPage.jsx";
import LaunchPage from "./LaunchPage.jsx";

const launchMode = import.meta.env.VITE_LAUNCH_MODE === "true";
const launchAt = Date.parse(import.meta.env.VITE_PUBLIC_LAUNCH_AT || "");

export default function PublicHomeRoute() {
  const [launchComplete, setLaunchComplete] = useState(
    () => !Number.isFinite(launchAt) || launchAt <= Date.now()
  );
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const completeLaunch = useCallback(() => setLaunchComplete(true), []);

  if (!initialized) return <Loader label="Loading MonoPrep..." />;
  if (user) return <RoleRedirect />;
  return launchMode && !launchComplete
    ? <LaunchPage onLaunchComplete={completeLaunch} />
    : <LandingPage />;
}
