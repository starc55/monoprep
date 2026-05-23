import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();
  const registerUser = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

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
          const user = await registerUser(values);
          navigate(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
        })}
      >
        <input placeholder="Full name" {...register('fullName')} />
        <input placeholder="Email address" type="email" {...register('email')} />
        <input placeholder="Password" type="password" {...register('password')} />
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </motion.form>
    </AuthLayout>
  );
}
