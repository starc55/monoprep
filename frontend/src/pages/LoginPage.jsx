import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

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
          const user = await login(values);
          navigate(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
        })}
      >
        <input placeholder="Email address" type="email" {...register('email')} />
        <input placeholder="Password" type="password" {...register('password')} />
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </motion.form>
      <p className="helper-copy">Use your MonoPrep account to continue.</p>
    </AuthLayout>
  );
}
