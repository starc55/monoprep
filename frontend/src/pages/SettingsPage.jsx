import { useEffect, useState } from "react";
import { Bell, Clock3, LockKeyhole, Mail, Save, SlidersHorizontal, Target } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import { useAuthStore } from "../store/authStore.js";
import { loadUserSettings, saveUserSettings } from "../utils/userPreferences.js";

const defaultSubjectOptions = [
  { value: "Mixed", label: "Mixed" },
  { value: "Reading & Writing", label: "Reading & Writing" },
  { value: "Math", label: "Math" },
];

function readSettings(user) {
  const saved = loadUserSettings(user);
  return {
    notificationEmail: saved.notificationEmail || user?.email || "",
    dailyReminder: saved.dailyReminder ?? true,
    weeklyDigest: saved.weeklyDigest ?? true,
    scoreReportEmail: saved.scoreReportEmail ?? true,
    targetScore: saved.targetScore || 1400,
    defaultSubject: saved.defaultSubject || "Mixed",
    timerWarnings: saved.timerWarnings ?? true,
    autoOpenCalculator: saved.autoOpenCalculator ?? false,
    language: saved.language || "uz",
  };
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="settings-line settings-toggle-line">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState(() => readSettings(user));
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    setSettings(readSettings(user));
    setSaveState("idle");
  }, [user]);

  function updateField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaveState("saving");
    if (settings.dailyReminder && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => "denied");
    }
    saveUserSettings(user, settings);
    setSaveState("saved");
  }

  return (
    <AppLayout title="Settings" subtitle="Set practical study defaults for this MonoPrep account.">
      <form className="settings-row-page" onSubmit={saveSettings}>
        <section className="settings-row-section">
          <header><Bell aria-hidden="true" /><div><h2>Study reminders</h2><p>Choose which study updates should reach you.</p></div></header>
          <label className="settings-line settings-input-line">
            <span><strong>Reminder email</strong><small>Used for progress digests and completed score reports.</small></span>
            <div className="settings-inline-input"><Mail aria-hidden="true" /><input type="email" value={settings.notificationEmail} onChange={(event) => updateField("notificationEmail", event.target.value)} /></div>
          </label>
          <ToggleRow label="Daily reminder" description="Allow a daily study prompt on this device." checked={settings.dailyReminder} onChange={(value) => updateField("dailyReminder", value)} />
          <ToggleRow label="Weekly progress digest" description="Keep a weekly summary ready for your reminder email." checked={settings.weeklyDigest} onChange={(value) => updateField("weeklyDigest", value)} />
          <ToggleRow label="Score report email" description="Send a report preference after a submitted exam." checked={settings.scoreReportEmail} onChange={(value) => updateField("scoreReportEmail", value)} />
        </section>

        <section className="settings-row-section">
          <header><SlidersHorizontal aria-hidden="true" /><div><h2>Practice preferences</h2><p>These values drive dashboard targets and exam defaults.</p></div></header>
          <label className="settings-line settings-input-line">
            <span><strong>Target SAT score</strong><small>Dashboard progress and recommendations use this target.</small></span>
            <div className="settings-inline-input compact"><Target aria-hidden="true" /><input type="number" min="400" max="1600" step="10" value={settings.targetScore} onChange={(event) => updateField("targetScore", Number(event.target.value))} /></div>
          </label>
          <div className="settings-line settings-select-line">
            <span><strong>Default practice section</strong><small>Preselect this subject when you start focused practice.</small></span>
            <PremiumSelect ariaLabel="Default practice section" value={settings.defaultSubject} onChange={(value) => updateField("defaultSubject", value)} options={defaultSubjectOptions} />
          </div>
          <ToggleRow label="Timer warnings" description="Show time checkpoints during timed practice." checked={settings.timerWarnings} onChange={(value) => updateField("timerWarnings", value)} />
          <ToggleRow label="Open calculator for Math" description="Use the official Desmos workspace automatically for Math sessions." checked={settings.autoOpenCalculator} onChange={(value) => updateField("autoOpenCalculator", value)} />
        </section>

        <section className="settings-security-row">
          <LockKeyhole aria-hidden="true" />
          <div><strong>Account security</strong><span>Authenticated as {user?.email || "your MonoPrep account"}</span></div>
          <span className="table-status approved">Protected</span>
        </section>

        <div className="settings-save-bar settings-row-save">
          <span>{saveState === "saved" ? "Preferences saved for this account." : "Changes apply after saving."}</span>
          <Button type="submit" disabled={saveState === "saving"}><Save aria-hidden="true" />{saveState === "saving" ? "Saving..." : "Save preferences"}</Button>
        </div>
      </form>
    </AppLayout>
  );
}
