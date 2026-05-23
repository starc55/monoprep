import { useState } from 'react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuthStore } from '../store/authStore.js';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    await updateProfile({ fullName });
    setSaving(false);
  }

  return (
    <AppLayout title="Profile" subtitle="Manage your student profile details.">
      <Card title="Account">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label>
            Email
            <input value={user?.email || ''} disabled />
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </Card>
    </AppLayout>
  );
}
