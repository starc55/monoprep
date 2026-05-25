import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  BookOpenCheck,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useAuthStore } from '../store/authStore.js';
import { getMyAnalytics } from '../services/analyticsService.js';

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase() || 'MP';
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getMyAnalytics().then(setAnalytics).catch(() => null);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile({ fullName });
    } catch {
      setSaveError('Profile could not be saved right now. Please try again after signing in.');
    } finally {
      setSaving(false);
    }
  }

  const attempts = analytics?.overview?.attemptsTaken || 0;
  const bestScore = analytics?.overview?.bestScore || 0;

  return (
    <AppLayout title="Profile" subtitle="Manage your account information and track your prep momentum.">
      <section className="profile-hero">
        <div className="profile-avatar">{getInitials(user?.fullName)}</div>
        <div className="profile-identity">
          <span className="profile-chip"><BadgeCheck aria-hidden="true" /> SAT Student</span>
          <h2>{user?.fullName || 'MonoPrep Student'}</h2>
          <p><Mail aria-hidden="true" /> {user?.email || 'Student account'}</p>
        </div>
        <div className="profile-highlights">
          <div><strong>{attempts}</strong><span>Tests completed</span></div>
          <div><strong>{bestScore}%</strong><span>Best score</span></div>
          <div><strong>{analytics?.overview?.averageScore || 0}%</strong><span>Average accuracy</span></div>
        </div>
      </section>

      <div className="profile-layout">
        <Card title="Account information" className="account-card">
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span><UserRound aria-hidden="true" /> Full name</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label className="form-field">
              <span><Mail aria-hidden="true" /> Email address</span>
              <input value={user?.email || ''} disabled />
            </label>
            {saveError ? <p className="support-status error">{saveError}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? <Sparkles aria-hidden="true" /> : <Save aria-hidden="true" />}
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <div className="profile-feature-grid">
          <StatCard icon={ShieldCheck} tone="green" label="Secure Account" value="Protected" hint="Authenticated profile and saved progress." />
          <StatCard icon={BookOpenCheck} tone="blue" label="Track Progress" value={`${attempts} tests`} hint="Every completed attempt updates analytics." />
          <StatCard icon={Sparkles} tone="violet" label="Smart Practice" value="AI Ready" hint="Feedback is available after submission." />
          <StatCard icon={Target} tone="amber" label="Achieve Goals" value={`${bestScore}%`} hint="Your personal best recorded so far." />
        </div>
      </div>

      <Card className="profile-progress-card">
        <div className="profile-progress-content">
          <span className="settings-card-icon blue"><Trophy aria-hidden="true" /></span>
          <div>
            <h3>Practice journey</h3>
            <p>Complete more timed papers to sharpen your analytics and grow your best score.</p>
          </div>
          <div className="profile-progress-score">
            <strong>{bestScore}%</strong>
            <span>Best score</span>
          </div>
        </div>
        <ProgressBar value={bestScore} />
      </Card>
    </AppLayout>
  );
}
