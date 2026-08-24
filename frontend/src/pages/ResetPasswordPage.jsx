import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { updatePassword } from '../services/authService.js';
import { useAuthStore } from '../store/authStore.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const hydrate = useAuthStore((state) => state.hydrate);

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 12 characters for your new MonoPrep password."
      alternatePath="/login"
      alternateLabel="Return to sign in"
    >
      <form
        className="stack-form"
        onSubmit={handleSubmit(async ({ password }) => {
          setLoading(true);
          setStatus('');
          try {
            await updatePassword(password);
            const user = await hydrate();
            setStatus('Password updated. Redirecting to MonoPrep...');
            const destination = user?.role === 'ADMIN'
              ? '/admin'
              : user?.role === 'TEACHER'
                ? user.teacherApprovalStatus === 'APPROVED' ? '/teacher' : '/teacher/pending'
                : '/dashboard';
            window.setTimeout(() => navigate(destination, { replace: true }), 900);
          } catch (error) {
            setStatus(error.message);
          } finally {
            setLoading(false);
          }
        })}
      >
        <input
          type="password"
          placeholder="New password"
          minLength={12}
          maxLength={128}
          {...register('password', { required: true, minLength: 12 })}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          {...register('confirmPassword', {
            required: true,
            validate: (value) => value === watch('password') || 'Passwords do not match.'
          })}
        />
        {errors.confirmPassword ? <p className="form-error">{errors.confirmPassword.message}</p> : null}
        {status ? <p className="support-status">{status}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
