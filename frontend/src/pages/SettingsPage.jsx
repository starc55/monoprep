import { Bell, LockKeyhole, SlidersHorizontal } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <AppLayout
      title="Settings"
      subtitle="Control your learning workspace preferences and account visibility."
    >
      <div className="content-grid settings-grid">
        <Card title="Account security" className="settings-card">
          <span className="settings-card-icon success"><LockKeyhole aria-hidden="true" /></span>
          <p>Your signed-in session is protected. Your exam attempts stay connected to {user?.email || 'your account'}.</p>
          <span className="pill success">Secure account</span>
        </Card>
        <Card title="Study notifications" className="settings-card">
          <span className="settings-card-icon blue"><Bell aria-hidden="true" /></span>
          <p>Progress reminders and product notifications will appear here as they become available.</p>
          <span className="pill">Coming soon</span>
        </Card>
        <Card title="Practice preferences" className="settings-card">
          <span className="settings-card-icon violet"><SlidersHorizontal aria-hidden="true" /></span>
          <p>Timing and exam-room controls remain tied to each secure practice test format.</p>
          <span className="pill">Default test mode</span>
        </Card>
      </div>
    </AppLayout>
  );
}
