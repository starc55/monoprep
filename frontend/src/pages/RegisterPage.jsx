import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLayout from "../layouts/AuthLayout.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { FcGoogle } from "react-icons/fc";

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const registerUser = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const verificationRequired = useAuthStore(
    (state) => state.verificationRequired
  );
  const { t } = useI18n();

  if (verificationRequired) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We sent a verification link to your email address. Verify it to activate your MonoPrep account."
        alternatePath="/login"
        alternateLabel="Return to sign in"
      >
        <div className="auth-success-state">
          <strong>Email verification required</strong>
          <p>
            After verification, MonoPrep will securely restore your Supabase
            session.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your prep account"
      subtitle="Start realistic SAT simulations with automatic scoring, adaptive insights, and exam-ready pacing."
      alternatePath="/login"
      alternateLabel="Already have an account? Sign in"
    >
      <motion.form
        className="stack-form"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(async (values) => {
          try {
            const result = await registerUser(values);
            if (result.user) {
              navigate("/dashboard");
            }
          } catch {
            // The auth store renders a user-friendly error.
          }
        })}
      >
        <input
          placeholder="Full name"
          {...register("fullName", { required: true, minLength: 2 })}
        />
        <input
          placeholder="Email address"
          type="email"
          {...register("email", { required: true })}
        />
        <input
          placeholder="Password"
          type="password"
          minLength={12}
          maxLength={128}
          {...register("password", { required: true, minLength: 12 })}
        />
        <input
          placeholder="Confirm password"
          type="password"
          {...register("confirmPassword", {
            required: true,
            validate: (value) =>
              value === watch("password") || "Passwords do not match.",
          })}
        />
        {errors.confirmPassword ? (
          <p className="form-error">{errors.confirmPassword.message}</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
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
    </AuthLayout>
  );
}
