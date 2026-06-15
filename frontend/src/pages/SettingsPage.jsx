import { useState } from 'react';
import { Bell, Clock3, LockKeyhole, Mail, Save, SlidersHorizontal, Target } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuthStore } from '../store/authStore.js';

function readSettings(user) {
  try {
    const saved = JSON.parse(localStorage.getItem('monoprep-settings') || '{}');
    return {
      notificationEmail: saved.notificationEmail || user?.email || '',
      dailyReminder: saved.dailyReminder ?? true,
      weeklyDigest: saved.weeklyDigest ?? true,
      scoreReportEmail: saved.scoreReportEmail ?? true,
      targetScore: saved.targetScore || 1400,
      defaultSubject: saved.defaultSubject || 'Mixed',
      timerWarnings: saved.timerWarnings ?? true,
      autoOpenCalculator: saved.autoOpenCalculator ?? false
    };
  } catch (_error) {
    return {
      notificationEmail: user?.email || '',
      dailyReminder: true,
      weeklyDigest: true,
      scoreReportEmail: true,
      targetScore: 1400,
      defaultSubject: 'Mixed',
      timerWarnings: true,
      autoOpenCalculator: false
    };
  }
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState(() => readSettings(user));
  const [saved, setSaved] = useState(false);

  function updateField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveSettings(event) {
    event.preventDefault();
    localStorage.setItem('monoprep-settings', JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Control your learning workspace preferences and account visibility."
    >
      <form className="settings-pro-grid" onSubmit={saveSettings}>
        <Card title="Account security" className="settings-card settings-pro-card">
          <span className="settings-card-icon success"><LockKeyhole aria-hidden="true" /></span>
          <p>Your signed-in session is protected. Your exam attempts stay connected to {user?.email || 'your account'}.</p>
          <span className="pill success">Secure account</span>
        </Card>

        <Card title="Study notifications" className="settings-card settings-pro-card">
          <span className="settings-card-icon blue"><Bell aria-hidden="true" /></span>
          <label className="form-field">
            <span><Mail aria-hidden="true" /> Notification email</span>
            <input
              type="email"
              value={settings.notificationEmail}
              onChange={(event) => updateField('notificationEmail', event.target.value)}
              placeholder="student@example.com"
            />
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={settings.dailyReminder} onChange={(event) => updateField('dailyReminder', event.target.checked)} />
            <span>Daily study reminder</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={settings.weeklyDigest} onChange={(event) => updateField('weeklyDigest', event.target.checked)} />
            <span>Weekly progress digest</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={settings.scoreReportEmail} onChange={(event) => updateField('scoreReportEmail', event.target.checked)} />
            <span>Email score report after submission</span>
          </label>
        </Card>

        <Card title="Practice preferences" className="settings-card settings-pro-card">
          <span className="settings-card-icon violet"><SlidersHorizontal aria-hidden="true" /></span>
          <div className="settings-form-grid">
            <label className="form-field">
              <span><Target aria-hidden="true" /> Target SAT score</span>
              <input
                type="number"
                min="400"
                max="1600"
                step="10"
                value={settings.targetScore}
                onChange={(event) => updateField('targetScore', Number(event.target.value))}
              />
            </label>
            <label className="form-field">
              <span>Default section</span>
              <select value={settings.defaultSubject} onChange={(event) => updateField('defaultSubject', event.target.value)}>
                <option value="Mixed">Mixed</option>
                <option value="Reading & Writing">Reading & Writing</option>
                <option value="Math">Math</option>
              </select>
            </label>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" checked={settings.timerWarnings} onChange={(event) => updateField('timerWarnings', event.target.checked)} />
            <span><Clock3 aria-hidden="true" /> Show timer warnings inside practice</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={settings.autoOpenCalculator} onChange={(event) => updateField('autoOpenCalculator', event.target.checked)} />
            <span>Open calculator automatically on math sessions</span>
          </label>
        </Card>

        <div className="settings-save-bar">
          <span>{saved ? 'Settings saved for this device.' : 'Adjust preferences, then save.'}</span>
          <Button type="submit">
            <Save aria-hidden="true" />
            Save Settings
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
