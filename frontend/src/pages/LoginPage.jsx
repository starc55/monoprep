import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLayout from "../layouts/AuthLayout.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useI18n();

  function getDestination(user) {
    if (user?.role === "ADMIN") return "/admin";
    if (user?.role === "TEACHER") {
      return user.teacherApprovalStatus === "APPROVED"
        ? "/teacher"
        : "/teacher/pending";
    }
    return "/dashboard";
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your SAT practice, review performance, and launch full exam simulations."
      alternatePath="/register"
      alternateLabel="Create a new account"
    >
      <motion.form
        className="stack-form"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(async (values) => {
          try {
            const user = await login(values);
            navigate(getDestination(user));
          } catch {
            // The auth store renders a user-friendly error.
          }
        })}
      >
        <input
          placeholder="Email address"
          type="email"
          {...register("email")}
        />
        <div className="auth-password-field">
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <Link className="auth-inline-link" to="/forgot-password">
          Forgot password?
        </Link>
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <div className="auth-divider">
          <span>{t("auth.or")}</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="google-auth-button"
          disabled={loading}
          onClick={loginWithGoogle}
          aria-label={t("auth.google")}
          title={t("auth.google")}
        >
          <span className="google-mark" aria-hidden="true">
            <FcGoogle size={24} />
          </span>
        </Button>
      </motion.form>
      <p className="helper-copy">Use your MonoPrep account to continue.</p>
    </AuthLayout>
  );
}
