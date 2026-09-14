import { useEffect } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { captureEvent, captureEventOnce } from "../../lib/analytics.js";
import LaunchCountdown from "./LaunchCountdown.jsx";

const launchAt = Date.parse(import.meta.env.VITE_PUBLIC_LAUNCH_AT || "");

export default function LaunchPage() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    captureEventOnce("launch_page_viewed", {
      launch_state: Number.isFinite(launchAt) && launchAt > Date.now() ? "countdown" : "live",
    });
  }, []);

  return (
    <main className="launch-page">
      <img className="launch-page-backdrop" src="/dashboard-assets/exam.webp" alt="" />
      <header className="launch-header">
        <Link className="launch-brand" to="/" aria-label="MonoPrep home">
          <img src="/monoprep-logo.png" alt="" />
          <span>MonoPrep</span>
        </Link>
        <Link
          className="launch-signin"
          to="/login"
          onClick={() => captureEvent("launch_signin_clicked")}
        >
          Sign In <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <motion.section
        className="launch-hero"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="launch-eyebrow">Public Launch</span>
        <h1>MonoPrep</h1>
        <p className="launch-lead">The smarter way to prepare for the SAT.</p>
        <LaunchCountdown launchAt={launchAt} />
        <p className="launch-supporting">Personalized practice. Smarter analytics. Better preparation.</p>
        <Link
          className="launch-primary-action"
          to="/login"
          onClick={() => captureEvent("launch_signin_clicked", { placement: "hero" })}
        >
          Continue to Sign In <ArrowRight aria-hidden="true" />
        </Link>
      </motion.section>

      <section className="launch-proof" aria-label="MonoPrep platform capabilities">
        <div><BookOpenCheck aria-hidden="true" /><span>Realistic Digital SAT practice</span></div>
        <div><Target aria-hidden="true" /><span>Focused skill preparation</span></div>
        <div><BarChart3 aria-hidden="true" /><span>Actionable score analytics</span></div>
      </section>
    </main>
  );
}

