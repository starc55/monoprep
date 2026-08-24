import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import { supabase } from "../config/supabase.js";
import { useAuthStore } from "../store/authStore.js";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((state) => state.hydrate);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function finishAuthentication() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) return;
      if (sessionError || !session) {
        setError("The sign-in link is invalid or has expired.");
        return;
      }

      const user = await hydrate();
      if (!active) return;
      if (!user) {
        setError("MonoPrep could not load the profile linked to this account.");
        return;
      }

      const destination =
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "TEACHER"
          ? user.teacherApprovalStatus === "APPROVED"
            ? "/teacher"
            : "/teacher/pending"
          : "/dashboard";
      navigate(destination, { replace: true });
    }

    finishAuthentication();
    return () => {
      active = false;
    };
  }, [hydrate, navigate]);

  if (!error) {
    return <Loader label="Securing your MonoPrep session..." />;
  }

  return (
    <AuthLayout
      title="Sign-in could not finish"
      subtitle={error}
      alternatePath="/login"
      alternateLabel="Return to sign in"
    >
      <Link className="button button-primary" to="/login">
        Try again
      </Link>
    </AuthLayout>
  );
}
