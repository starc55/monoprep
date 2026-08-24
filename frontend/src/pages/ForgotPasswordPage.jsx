import { useState } from 'react';
import { useForm } from 'react-hook-form';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { sendPasswordReset } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const { register, handleSubmit } = useForm();
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your MonoPrep email and we will send a secure recovery link."
      alternatePath="/login"
      alternateLabel="Return to sign in"
    >
      <form
        className="stack-form"
        onSubmit={handleSubmit(async ({ email }) => {
          setLoading(true);
          setStatus({ type: '', message: '' });
          try {
            await sendPasswordReset(email);
            setStatus({
              type: 'success',
              message: 'Check your email for the MonoPrep password reset link.'
            });
          } catch (error) {
            setStatus({ type: 'error', message: error.message });
          } finally {
            setLoading(false);
          }
        })}
      >
        <input
          type="email"
          placeholder="Email address"
          {...register('email', { required: true })}
        />
        {status.message ? <p className={`support-status ${status.type}`}>{status.message}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}
