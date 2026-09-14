import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  capturePageView,
  identifyAnalyticsUser,
  resetAnalytics,
} from "../../lib/analytics.js";
import { setMonitoringRoute, setMonitoringUser } from "../../lib/monitoring.js";
import { useAuthStore } from "../../store/authStore.js";

export default function AppTelemetry() {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    capturePageView(pathname);
    setMonitoringRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      identifyAnalyticsUser(user);
      setMonitoringUser(user);
      return;
    }
    resetAnalytics();
    setMonitoringUser(null);
  }, [initialized, user]);

  return null;
}

