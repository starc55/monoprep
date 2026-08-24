import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

export function getRoleDestination(user) {
  if (!user) return "/login";
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "TEACHER") {
    return user.teacherApprovalStatus === "APPROVED"
      ? "/teacher"
      : "/teacher/pending";
  }
  return "/dashboard";
}

export function RoleRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getRoleDestination(user)} replace />;
}

export function StudentRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "STUDENT") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  return children;
}

export function TeacherRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "TEACHER") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }
  if (user.teacherApprovalStatus !== "APPROVED") {
    return <Navigate to="/teacher/pending" replace />;
  }

  return children;
}

export function TeacherAccountRoute({ children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "TEACHER") {
    return <Navigate to={getRoleDestination(user)} replace />;
  }

  return children;
}
