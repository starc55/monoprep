import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/dist/locomotive-scroll.css";
import LanguageSwitcher from "../components/ui/LanguageSwitcher.jsx";
import { dashboardAssets } from "../data/dashboardAssets.js";
import { useI18n } from "../i18n/I18nProvider.jsx";

const tracks = [
  {
    key: "sat",
    asset: dashboardAssets.exam,
    label: "SAT",
    stat: "1600",
    icon: BookOpenCheck,
  },
  {
    key: "ielts",
    asset: dashboardAssets.pen,
    label: "IELTS",
    stat: "9.0",
    icon: Languages,
  },
  {
    key: "university",
    asset: dashboardAssets.hat,
    label: "University",
    stat: "Top 100",
    icon: GraduationCap,
  },
];

const founders = [
  {
    key: "product",
    img: dashboardAssets.ogabek,
    name: "Og'abek Orziyev",
    asset: dashboardAssets.ai,
  },
  {
    key: "academic",
    img: dashboardAssets.java,
    initials: "AL",
    name: "Rustamov Javohir",
    asset: dashboardAssets.exam,
  },
  {
    key: "engineering",
    img: dashboardAssets.moh,
    initials: "PE",
    name: "Maftunaxon Muhammadiyeva",
    asset: dashboardAssets.chart,
  },
];

export default function LandingPage() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [activeTrack, setActiveTrack] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const interval = window.setInterval(
      () => setActiveTrack((current) => (current + 1) % tracks.length),
      4600
    );
    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 821px)").matches;
    if (!desktop || reduceMotion) return undefined;

    const scroll = new LocomotiveScroll({
      autoStart: true,
      lenisOptions: {
        duration: 1.05,
        smoothWheel: true,
        smoothTouch: false,
      },
    });

    return () => scroll.destroy();
  }, [reduceMotion]);

  const active = tracks[activeTrack];

  return (
    <main className="marketing-page">
      <section className="marketing-hero" id="about" data-scroll>
        <nav className="marketing-nav" aria-label="Public navigation">
          <Link className="marketing-brand" to="/" aria-label="MonoPrep home">
            <img src="/monoprep-logo.png" alt="" />
            <span>MonoPrep</span>
          </Link>
          <div className="marketing-nav-links">
            <a href="#about">{t("landing.nav.about")}</a>
            <a href="#platform">{t("landing.nav.platform")}</a>
            <a href="#founders">{t("landing.nav.founders")}</a>
            <a href="#contact">{t("landing.nav.contact")}</a>
          </div>
          <div className="marketing-nav-actions">
            <LanguageSwitcher className="language-switcher-dark" />
            <Link className="marketing-signin" to="/products">
              {t("landing.signIn")}
            </Link>
          </div>
        </nav>

        <div className="marketing-hero-content">
          <motion.div
            className="marketing-hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                className="marketing-copy-rotation"
                initial={{ opacity: 0, x: -18, filter: "blur(7px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 16, filter: "blur(7px)" }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="marketing-eyebrow">
                  {t(`landing.track.${active.key}.eyebrow`)}
                </span>
                <h1>{t(`landing.track.${active.key}.title`)}</h1>
                <p>{t(`landing.track.${active.key}.copy`)}</p>
              </motion.div>
            </AnimatePresence>
            <div
              className="marketing-track-dots"
              aria-label="Preparation tracks"
            >
              {tracks.map((track, index) => (
                <button
                  key={track.key}
                  type="button"
                  className={index === activeTrack ? "active" : ""}
                  onClick={() => setActiveTrack(index)}
                  aria-label={`Show ${track.label}`}
                  aria-pressed={index === activeTrack}
                >
                  <span>{track.label}</span>
                </button>
              ))}
            </div>
            <div className="marketing-hero-actions">
              <Link className="button marketing-primary" to="/products">
                <Play aria-hidden="true" /> {t("landing.start")}
              </Link>
              <a className="button marketing-secondary" href="#platform">
                {t("landing.secondary")} <ArrowRight aria-hidden="true" />
              </a>
            </div>
            <div className="marketing-metrics" id="results">
              <span>
                <b>01</b>
                {t("landing.metric.exams")}
              </span>
              <span>
                <b>02</b>
                {t("landing.metric.analytics")}
              </span>
              <span>
                <b>03</b>
                {t("landing.metric.focus")}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="marketing-visual"
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            aria-label="MonoPrep learning tracks"
          >
            {tracks.map((track, index) => (
              <motion.div
                key={track.key}
                className={`visual-column visual-column-${track.key}`}
                animate={
                  reduceMotion ? undefined : { y: [0, index % 2 ? 18 : -14, 0] }
                }
                transition={{
                  duration: 5.6 + index * 0.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.35,
                }}
              >
                <img
                  src={track.asset}
                  alt={`${track.label} preparation illustration`}
                />
                <span>
                  {track.label}
                  <br />
                  <b>{track.stat}</b>
                </span>
              </motion.div>
            ))}
            <div
              className="marketing-preview-note"
              data-scroll
              data-scroll-speed="-0.05"
            >
              <img src={dashboardAssets.mono} alt="" />
              <div>
                <strong>{t("landing.preview.title")}</strong>
                <p>{t("landing.preview.copy")}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="marketing-platform" id="platform" data-scroll>
        <header>
          <span>MonoPrep Learning</span>
          <h2>{t("landing.section.title")}</h2>
          <p>{t("landing.section.subtitle")}</p>
        </header>
        <div className="marketing-feature-grid">
          {tracks.map(({ key, icon: Icon, asset }, index) => (
            <motion.article
              key={key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.06 }}
            >
              <img
                src={asset}
                alt=""
                loading="lazy"
                data-scroll
                data-scroll-speed={index % 2 ? "0.04" : "-0.04"}
              />
              <Icon aria-hidden="true" />
              <span>0{index + 1}</span>
              <h3>{t(`landing.feature.${key}`)}</h3>
              <p>{t(`landing.feature.${key}.copy`)}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="marketing-founders" id="founders" data-scroll>
        <header data-scroll data-scroll-speed="0.025">
          <span>{t("landing.founders.eyebrow")}</span>
          <h2>{t("landing.founders.title")}</h2>
          <p>{t("landing.founders.copy")}</p>
        </header>
        <div className="marketing-founder-grid">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.key}
              className={`founder-card founder-card-${founder.key}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: index * 0.08 }}
            >
              <img
                className="founder-card-art light-surface-3d"
                src={founder.asset}
                alt=""
                loading="lazy"
                data-scroll
                data-scroll-speed={index % 2 ? "0.055" : "-0.045"}
              />
              <div className="founder-profile-frame">
                {founder.img ? (
                  <img
                    src={founder.img}
                    alt={`${founder.name} profile`}
                    className="founder-profile-img"
                    loading="lazy"
                  />
                ) : (
                  <span className="founder-avatar" aria-hidden="true">{founder.initials}</span>
                )}
              </div>
              <div>
                <strong>{founder.name}</strong>
                <small>{t(`landing.founder.${founder.key}.role`)}</small>
              </div>
              <p>{t(`landing.founder.${founder.key}.copy`)}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="marketing-cta" data-scroll>
        <img src={dashboardAssets.mono} alt="" loading="lazy" />
        <div>
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.copy")}</p>
        </div>
        <Link className="button marketing-primary" to="/products">
          {t("landing.start")} <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <footer className="marketing-footer" id="contact">
        <div className="marketing-footer-brand">
          <Link className="marketing-brand" to="/">
            <img src="/monoprep-logo.png" alt="" />
            <span>MonoPrep</span>
          </Link>
          <p>{t("landing.footer.copy")}</p>
        </div>
        <div className="marketing-footer-links">
          <strong>{t("landing.footer.platform")}</strong>
          <a href="#platform">SAT</a>
          <a href="#platform">IELTS</a>
          <a href="#platform">University</a>
        </div>
        <div className="marketing-footer-links">
          <strong>Legal</strong>
          <Link to="/legal/terms">Terms of Use</Link>
          <Link to="/legal/privacy">Privacy Policy</Link>
          <Link to="/legal/academic-integrity">Academic Integrity</Link>
          <Link to="/legal/cookies">Cookie Policy</Link>
          <a href="/legal/monoprep-platform-policies.pdf" download>Download policies PDF</a>
        </div>
        <div className="marketing-footer-contact">
          <strong>{t("landing.footer.contact")}</strong>
          <a href="mailto:hello@monoprep.uz">
            <Mail aria-hidden="true" /> monoprepsupport@gmail.com
          </a>
          <span>
            <MapPin aria-hidden="true" /> Tashkent, Uzbekistan
          </span>
        </div>
        <div className="marketing-footer-bottom">
          <small>&copy; {new Date().getFullYear()} MonoPrep</small>
          <span>{t("landing.footer.note")}</span>
        </div>
      </footer>
    </main>
  );
}
