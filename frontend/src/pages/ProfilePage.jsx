import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Mail,
  Save,
  Sparkles,
  Trophy,
  UserRound
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useAuthStore } from '../store/authStore.js';
import { uploadAvatar } from '../services/authService.js';
import { getMyAnalytics } from '../services/analyticsService.js';
import { getLeagueFromScore, getLevelFromScore } from '../utils/league.js';

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
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getMyAnalytics().then(setAnalytics).catch(() => null);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await updateProfile({
        fullName,
        username: username.trim() || null,
        avatarUrl: avatarUrl.trim() || null
      });
      setSaveSuccess('Profile changes saved.');
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Profile could not be saved right now. Please try again after signing in.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const uploadedUrl = await uploadAvatar(file);
      setAvatarUrl(uploadedUrl);
      await updateProfile({ avatarUrl: uploadedUrl });
      setSaveSuccess('Profile image updated.');
    } catch (error) {
      setSaveError(error.message || 'Avatar could not be uploaded.');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  }

  const attempts = analytics?.overview?.attemptsTaken || 0;
  const bestScore = analytics?.overview?.bestScore || 0;
  const gamification = analytics?.overview?.gamification;
  const league = gamification?.league
    ? { key: gamification.league.toLowerCase(), name: gamification.league }
    : getLeagueFromScore(bestScore);
  const level = gamification?.level || getLevelFromScore(bestScore, attempts, analytics?.overview?.averageScore || 0);

  return (
    <AppLayout title="Profile" subtitle="Manage your account information and track your prep momentum.">
      <section className="profile-hero">
        <button
          type="button"
          className="profile-avatar editable-avatar"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(user?.fullName)}
          <span><Camera aria-hidden="true" /> {uploadingAvatar ? 'Uploading...' : 'Change image'}</span>
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleAvatarFile}
          disabled={uploadingAvatar}
        />
        <div className="profile-identity">
          <div className="profile-chip-row">
            <span className="profile-chip"><BadgeCheck aria-hidden="true" /> SAT Student</span>
            <span className={`league-badge league-${league.key}`}>Level {level} - {league.name}</span>
          </div>
          <h2>{user?.fullName || 'MonoPrep Student'}</h2>
          <p><Mail aria-hidden="true" /> {user?.username ? `@${user.username}` : user?.email || 'Student account'}</p>
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
              <span><Trophy aria-hidden="true" /> Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="monoprep_player"
                maxLength={24}
              />
            </label>
            <div className="profile-upload-hint">
              <Camera aria-hidden="true" />
              <span>Click your avatar above to upload a profile image.</span>
            </div>
            <label className="form-field">
              <span><Mail aria-hidden="true" /> Email address</span>
              <input value={user?.email || ''} disabled />
            </label>
            {saveError ? <p className="support-status error">{saveError}</p> : null}
            {saveSuccess ? <p className="support-status success">{saveSuccess}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? <Sparkles aria-hidden="true" /> : <Save aria-hidden="true" />}
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <section className="profile-momentum-panel">
          <div className="profile-momentum-heading"><span>Learning profile</span><h3>{league.name} League</h3><p>Your league and level are calculated from submitted MonoPrep work.</p></div>
          <div className="profile-momentum-metrics"><div><span>Level</span><strong>{level}</strong></div><div><span>Completed</span><strong>{attempts}</strong></div><div><span>Best score</span><strong>{bestScore || '--'}</strong></div></div>
          <div className="profile-progress-content"><div><h3>Practice journey</h3><p>Complete timed papers to sharpen your analytics and build league progress.</p></div><div className="profile-progress-score"><strong>{bestScore}</strong><span>score</span></div></div>
          <ProgressBar value={Math.min(100, Math.round((bestScore / 1600) * 100))} />
        </section>
      </div>
    </AppLayout>
  );
}
