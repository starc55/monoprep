const SETTINGS_PREFIX = 'monoprep:settings';

export const languageOptions = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'en', label: 'English' },
  { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' }
];

function getAccountKey(user) {
  return user?.id || user?.authUserId || user?.email || 'guest';
}

export function getUserSettingsKey(user) {
  return `${SETTINGS_PREFIX}:${getAccountKey(user)}`;
}

export function loadUserSettings(user) {
  try {
    const accountSettings = localStorage.getItem(getUserSettingsKey(user));
    if (accountSettings) return JSON.parse(accountSettings);

    const legacySettings = localStorage.getItem('monoprep-settings');
    if (!legacySettings) return {};
    localStorage.setItem(getUserSettingsKey(user), legacySettings);
    localStorage.removeItem('monoprep-settings');
    return JSON.parse(legacySettings);
  } catch (_error) {
    return {};
  }
}

export function saveUserSettings(user, settings) {
  localStorage.setItem(getUserSettingsKey(user), JSON.stringify(settings));
  document.documentElement.lang = settings.language || 'uz';
  window.dispatchEvent(new CustomEvent('monoprep:settings-change', { detail: settings }));
  window.dispatchEvent(
    new CustomEvent('monoprep:language-change', {
      detail: { language: settings.language || 'uz' }
    })
  );
}
