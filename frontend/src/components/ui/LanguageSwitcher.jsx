import { supportedLanguages } from "../../i18n/translations.js";
import { useI18n } from "../../i18n/I18nProvider.jsx";

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage } = useI18n();

  return (
    <div className={`language-switcher ${className}`.trim()} aria-label="Interface language">
      {supportedLanguages.map((option) => (
        <button
          key={option.value}
          type="button"
          className={language === option.value ? "active" : ""}
          aria-pressed={language === option.value}
          title={option.label}
          onClick={() => setLanguage(option.value)}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
