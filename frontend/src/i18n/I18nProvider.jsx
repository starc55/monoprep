import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import {
  loadUserSettings,
  saveUserSettings,
} from "../utils/userPreferences.js";
import { literalTranslations, messages } from "./translations.js";

const I18nContext = createContext(null);
const GUEST_LANGUAGE_KEY = "monoprep:language";
const localizedNodeState = new WeakMap();
const localizedAttributeState = new WeakMap();
const LOCALIZED_ATTRIBUTES = ["placeholder", "aria-label", "title"];

function interpolate(value, variables = {}) {
  return Object.entries(variables).reduce(
    (result, [key, replacement]) =>
      result.replaceAll(`{${key}}`, String(replacement)),
    value
  );
}

export function I18nProvider({ children }) {
  const user = useAuthStore((state) => state.user);
  const [language, setLanguageState] = useState(() => {
    const guestLanguage = window.localStorage.getItem(GUEST_LANGUAGE_KEY);
    return ["uz", "en", "ru"].includes(guestLanguage) ? guestLanguage : "uz";
  });

  useEffect(() => {
    const settings = loadUserSettings(user);
    const nextLanguage =
      settings.language ||
      window.localStorage.getItem(GUEST_LANGUAGE_KEY) ||
      "uz";
    setLanguageState(
      ["uz", "en", "ru"].includes(nextLanguage) ? nextLanguage : "uz"
    );
  }, [user?.id, user?.authUserId, user?.email]);

  const setLanguage = useCallback(
    (nextLanguage) => {
      if (!["uz", "en", "ru"].includes(nextLanguage)) return;
      setLanguageState(nextLanguage);
      window.localStorage.setItem(GUEST_LANGUAGE_KEY, nextLanguage);
      const settings = loadUserSettings(user);
      saveUserSettings(user, { ...settings, language: nextLanguage });
    },
    [user]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t(key, variables) {
        const message = messages[language]?.[key] || messages.en[key] || key;
        return interpolate(message, variables);
      },
      literal(source) {
        if (!source || language === "en") return source;
        return literalTranslations[language]?.[source] || source;
      },
    }),
    [language, setLanguage]
  );

  return (
    <I18nContext.Provider value={value}>
      <InterfaceLocalizer language={language} />
      {children}
    </I18nContext.Provider>
  );
}

function InterfaceLocalizer({ language }) {
  const location = useLocation();

  useEffect(() => {
    const examRoomRoute = /^\/attempts\/[^/]+\/exam\/?$/.test(
      location.pathname
    );
    if (examRoomRoute) return undefined;

    const translate = (source) => {
      if (language === "en") return source;
      return literalTranslations[language]?.[source] || source;
    };

    function localizeTextNode(node) {
      if (
        !node.nodeValue ||
        node.parentElement?.closest("[data-no-i18n], .exam-room-shell")
      )
        return;
      const trimmed = node.nodeValue.trim();
      if (!trimmed) return;
      const previous = localizedNodeState.get(node);
      const source =
        previous && node.nodeValue === previous.applied
          ? previous.source
          : trimmed;
      const translated = translate(source);
      if (translated === source && language === "en") return;
      const leading = node.nodeValue.match(/^\s*/)?.[0] || "";
      const trailing = node.nodeValue.match(/\s*$/)?.[0] || "";
      const applied = `${leading}${translated}${trailing}`;
      localizedNodeState.set(node, { source, applied });
      if (node.nodeValue !== applied) node.nodeValue = applied;
    }

    function localizeAttributes(element) {
      if (
        !element?.getAttribute ||
        element.closest?.("[data-no-i18n], .exam-room-shell")
      )
        return;
      const previousState = localizedAttributeState.get(element) || {};
      const nextState = { ...previousState };

      LOCALIZED_ATTRIBUTES.forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (!current) return;
        const previous = previousState[attribute];
        const source =
          previous && current === previous.applied ? previous.source : current;
        const applied = translate(source);
        nextState[attribute] = { source, applied };
        if (current !== applied) element.setAttribute(attribute, applied);
      });

      localizedAttributeState.set(element, nextState);
    }

    function localizeTree(root) {
      if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
      localizeAttributes(root);
      root
        .querySelectorAll("[placeholder], [aria-label], [title]")
        .forEach(localizeAttributes);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        localizeTextNode(node);
        node = walker.nextNode();
      }
    }

    localizeTree(document.getElementById("root"));
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData")
          localizeTextNode(mutation.target);
        if (mutation.type === "attributes") localizeAttributes(mutation.target);
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node);
          else localizeTree(node);
        });
      });
    });
    const root = document.getElementById("root");
    if (root)
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: LOCALIZED_ATTRIBUTES,
      });
    return () => observer.disconnect();
  }, [language, location.pathname]);

  return null;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
