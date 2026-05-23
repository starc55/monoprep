import { useState } from 'react';
import { useForm } from 'react-hook-form';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { sendSupportRequest } from '../services/supportService.js';

export default function SupportPage() {
  const form = useForm({
    defaultValues: {
      subject: '',
      message: ''
    }
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sending, setSending] = useState(false);

  async function handleSubmit(values) {
    setSending(true);
    setStatus({ type: '', message: '' });

    try {
      await sendSupportRequest({
        ...values,
        pageUrl: window.location.href
      });
      form.reset();
      setStatus({
        type: 'success',
        message: 'Support request sent. We received it in Telegram.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Support request could not be sent right now.'
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <AppLayout
      title="Support"
      subtitle="Tell us what is not working. Your message is sent directly to the MonoPrep Telegram support channel."
    >
      <div className="content-grid two-up support-grid">
        <Card title="Send a support request">
          <form className="stack-form" onSubmit={form.handleSubmit(handleSubmit)}>
            <label>
              Subject
              <input
                placeholder="Example: Exam timer issue"
                {...form.register('subject', { required: true })}
              />
            </label>
            <label>
              Problem
              <textarea
                placeholder="Describe what happened, which page you were on, and what you expected."
                {...form.register('message', { required: true })}
              />
            </label>
            {status.message ? (
              <p className={`support-status ${status.type}`.trim()}>{status.message}</p>
            ) : null}
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send to support'}
            </Button>
          </form>
        </Card>

        <Card title="What to include">
          <ul className="clean-list">
            <li>Which page or exam section had the problem.</li>
            <li>What you clicked before the problem appeared.</li>
            <li>Any error message you saw.</li>
            <li>Whether the issue happened on phone or desktop.</li>
          </ul>
        </Card>
      </div>
    </AppLayout>
  );
}
