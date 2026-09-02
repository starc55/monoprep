import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "../layouts/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import LordIcon from "../components/ui/LordIcon.jsx";
import { getExams } from "../services/examService.js";
import { getMyAttempts } from "../services/attemptService.js";
import { useAuthStore } from "../store/authStore.js";

const lordIcons = {
  paper: "https://cdn.lordicon.com/hmpomorl.json",
  premium: "https://cdn.lordicon.com/lewtedlh.json",
  empty: "https://cdn.lordicon.com/weqkkuwt.json",
  free: "https://cdn.lordicon.com/upkivhua.json",
  progress: "https://cdn.lordicon.com/oqhqyeud.json",
  completed: "https://cdn.lordicon.com/lvrxlmju.json",
  action: "https://cdn.lordicon.com/hmpomorl.json",
};

const tabs = [
  { id: "ALL", label: "All Papers", icon: lordIcons.paper },
  { id: "FREE", label: "Free Tests", icon: lordIcons.free },
  { id: "PREMIUM", label: "Premium Tests", icon: lordIcons.premium },
  { id: "IN_PROGRESS", label: "In Progress", icon: lordIcons.progress },
  { id: "COMPLETED", label: "Completed", icon: lordIcons.completed },
];

const sortOptions = [
  { value: "newest", label: "Newest to Oldest" },
  { value: "oldest", label: "Oldest to Newest" },
  { value: "free", label: "Free First" },
  { value: "premium", label: "Premium First" },
  { value: "completed", label: "Completed First" },
];

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`${label} request timed out`)),
      timeoutMs
    );
  });

  return Promise.race([promise, timeout]).finally(() =>
    window.clearTimeout(timeoutId)
  );
}

function isPremiumExam(exam) {
  return (
    exam.accessType === "PAID" ||
    exam.accessType === "PREMIUM" ||
    exam.isPremium === true ||
    exam.premium === true
  );
}

function isCompletedAttempt(attempt) {
  return attempt && attempt.status !== "IN_PROGRESS";
}

function getExamAttempts(attempts, examId) {
  const examAttempts = attempts.filter((attempt) => attempt.examId === examId);
  const inProgressAttempt =
    examAttempts.find((attempt) => attempt.status === "IN_PROGRESS") || null;
  const completedAttempt =
    examAttempts.find((attempt) => attempt.status !== "IN_PROGRESS") || null;

  return {
    attempt: inProgressAttempt || completedAttempt,
    inProgressAttempt,
    completedAttempt,
  };
}

function toSatScore(score, section = false) {
  if (score === null || score === undefined) return null;
  if (score > 100) return Math.round(score);
  return Math.round((section ? 200 : 400) + (score / 100) * (section ? 600 : 1200));
}

function formatScore(score, section = false) {
  const satScore = toSatScore(score, section);
  return satScore === null ? "Not taken" : String(satScore);
}

function ExamCard({ row, canUsePremium }) {
  const { exam, attempt, premium, newest, paperNumber } = row;
  const inProgress = attempt?.status === "IN_PROGRESS";
  const completed = isCompletedAttempt(attempt);
  const locked = premium && !canUsePremium;
  const isFullLength = exam.type === "FULL_LENGTH";
  const fullLengthFinished = completed && isFullLength;
  const peopleTook =
    exam.peopleTookCount ?? exam.attemptsCount ?? exam.takenCount ?? "--";
  const questionsCount =
    exam.sections?.reduce(
      (total, section) =>
        total + (section.questionsCount || section.questions?.length || 0),
      0
    ) || 0;

  return (
    <motion.article
      className={`paper-card ${premium ? "paper-premium" : ""} ${
        completed ? "paper-completed" : ""
      }`.trim()}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="paper-head">
        <span className="paper-icon paper-icon-animated">
          <LordIcon
            src={premium ? lordIcons.premium : lordIcons.paper}
            size={44}
            stroke="bold"
            state={premium ? "hover-pinch" : undefined}
            colors={
              premium
                ? "primary:#9e6208,secondary:#356df3"
                : "primary:#0b1f45,secondary:#356df3"
            }
          />
        </span>
        <div>
          <h2>Paper #{paperNumber}</h2>
          <p>{exam.title}</p>
        </div>
        <span className={`access-badge ${premium ? "premium" : "free"}`}>
          <LordIcon
            src={premium ? lordIcons.premium : lordIcons.free}
            size={22}
            className="lordicon-inline"
            stroke="bold"
            state="loop-rotate"
            colors={
              premium
                ? "primary:#9e6208,secondary:#356df3"
                : "primary:#178748,secondary:#356df3"
            }
          />
          {premium ? "Premium" : "Free"}
        </span>
      </div>

      <div className="paper-badges">
        <span className="pill blue">
          Version{" "}
          {exam.difficultyLabel ||
            (paperNumber % 2 ? "Hard" : "May Predictions")}
        </span>
        {newest ? (
          <span className="pill amber">
            <LordIcon
              src={lordIcons.premium}
              size={22}
              className="lordicon-inline"
              stroke="bold"
              colors="primary:#9a6007,secondary:#356df3"
            />
            Newest Test
          </span>
        ) : null}
        <span className="pill">
          {isFullLength ? "Full Length" : "Practice Test"}
        </span>
        <span className={`pill exam-source-pill ${(exam.source || "MONOPREP").toLowerCase()}`}>
          {exam.source === "OFFICIAL" ? "Official Exam" : "MonoPrep Exam"}
        </span>
        {inProgress ? (
          <span className="pill info">
            <LordIcon
              src={lordIcons.progress}
              size={22}
              className="lordicon-inline"
              stroke="bold"
            />
            In Progress
          </span>
        ) : null}
        {completed ? (
          <span className="pill success">
            <LordIcon
              src={lordIcons.completed}
              size={22}
              className="lordicon-inline"
              stroke="bold"
              colors="primary:#1f6b45,secondary:#356df3"
            />
            Completed
          </span>
        ) : null}
      </div>

      {completed ? (
        <div className="paper-score">
          <div className="paper-score-head">
            <div>
              <span>Final score</span>
              <strong>{formatScore(attempt.totalScore)}</strong>
            </div>
            <div className="score-sections">
              <span>
                Reading/Writing{" "}
                <strong>{formatScore(attempt.readingWritingScore, true)}</strong>
              </span>
              <span>
                Math <strong>{formatScore(attempt.mathScore, true)}</strong>
              </span>
            </div>
          </div>
          <ProgressBar value={Math.max(0, Math.min(100, ((toSatScore(attempt.totalScore) || 400) - 400) / 12))} tone="green" />
        </div>
      ) : (
        <div className="paper-metrics">
          <div>
            <span>People took</span>
            <strong>{peopleTook}</strong>
          </div>
          <div>
            <span>Your last score</span>
            <strong>
              {formatScore(exam.lastScore ?? attempt?.totalScore)}
            </strong>
          </div>
          <div>
            <span>Questions</span>
            <strong>{questionsCount || "--"}</strong>
          </div>
          <div>
            <span>Minutes</span>
            <strong>{exam.totalDuration || "--"}</strong>
          </div>
        </div>
      )}

      <div className="paper-actions">
        {locked ? (
          <button type="button" className="button button-premium" disabled>
            <LordIcon
              src={lordIcons.premium}
              size={24}
              className="lordicon-inline"
              stroke="bold"
            />
            Upgrade to Access
          </button>
        ) : inProgress ? (
          <Link
            className="button button-primary"
            to={`/attempts/${attempt.id}/exam`}
          >
            <LordIcon
              src={lordIcons.action}
              size={24}
              className="lordicon-inline"
              stroke="bold"
              colors="primary:#ffffff,secondary:#93c5fd"
            />
            Continue Test
          </Link>
        ) : fullLengthFinished ? (
          <Link
            className="button button-primary"
            to={`/attempts/${attempt.id}/review`}
          >
            <LordIcon
              src={lordIcons.progress}
              size={24}
              className="lordicon-inline"
              stroke="bold"
              colors="primary:#ffffff,secondary:#93c5fd"
            />
            View Analytics
          </Link>
        ) : completed ? (
          <div className="paper-action-split">
            <Link
              className="button button-primary"
              to={`/exams/${exam.id}/instructions`}
            >
              <LordIcon
                src={lordIcons.action}
                size={24}
                className="lordicon-inline"
                stroke="bold"
                colors="primary:#ffffff,secondary:#93c5fd"
              />
              Start Again
            </Link>
            <Link
              className="button button-ghost"
              to={`/attempts/${attempt.id}/review`}
            >
              Last Result
            </Link>
          </div>
        ) : (
          <Link
            className="button button-primary"
            to={`/exams/${exam.id}/instructions`}
          >
            <LordIcon
              src={lordIcons.action}
              size={24}
              className="lordicon-inline"
              stroke="bold"
              colors="primary:#ffffff,secondary:#93c5fd"
            />
            Start Test
          </Link>
        )}
      </div>
    </motion.article>
  );
}

export default function PracticePage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadExamRows() {
      setLoading(true);
      setLoadError("");
      try {
        const examRows = await withTimeout(getExams(), 12000, "Practice exams");
        if (!active) return;
        setExams(Array.isArray(examRows) ? examRows : []);
      } catch (error) {
        if (!active) return;
        setExams([]);
        setLoadError(
          error?.response?.data?.message ||
            error.message ||
            "Practice exams could not be loaded."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadAttemptRows() {
      try {
        const attemptRows = await withTimeout(
          getMyAttempts(),
          12000,
          "Attempts"
        );
        if (active) setAttempts(Array.isArray(attemptRows) ? attemptRows : []);
      } catch (_error) {
        if (active) setAttempts([]);
      }
    }

    loadExamRows();
    loadAttemptRows();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const canUsePremium = Boolean(
    user?.role === "ADMIN" ||
      user?.hasPremiumAccess
  );
  const examRows = useMemo(
    () => {
      const chronologicalIds = [...exams]
        .sort((left, right) => {
          const dateDifference = new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
          return dateDifference || String(left.id).localeCompare(String(right.id));
        })
        .map((exam) => exam.id);
      const paperNumberById = new Map(chronologicalIds.map((id, index) => [id, index + 1]));
      return exams.map((exam, index) => {
        const examAttempts = getExamAttempts(attempts, exam.id);
        return {
          exam,
          ...examAttempts,
          premium: isPremiumExam(exam),
          newest: index < 3,
          paperNumber: paperNumberById.get(exam.id) || index + 1,
        };
      });
    },
    [attempts, exams]
  );

  const counts = useMemo(
    () => ({
      ALL: examRows.length,
      FREE: examRows.filter((row) => !row.premium).length,
      PREMIUM: examRows.filter((row) => row.premium).length,
      IN_PROGRESS: examRows.filter((row) => row.inProgressAttempt).length,
      COMPLETED: examRows.filter((row) => row.completedAttempt).length,
    }),
    [examRows]
  );

  const visibleRows = useMemo(() => {
    const filtered = examRows.filter((row) => {
      if (sourceFilter !== "ALL" && (row.exam.source || "MONOPREP") !== sourceFilter) return false;
      if (activeTab === "FREE") return !row.premium;
      if (activeTab === "PREMIUM") return row.premium;
      if (activeTab === "IN_PROGRESS") return Boolean(row.inProgressAttempt);
      if (activeTab === "COMPLETED") return Boolean(row.completedAttempt);
      return true;
    });

    const contextualRows = filtered.map((row) => {
      if (activeTab === "IN_PROGRESS")
        return { ...row, attempt: row.inProgressAttempt };
      if (activeTab === "COMPLETED")
        return { ...row, attempt: row.completedAttempt };
      return row;
    });

    return contextualRows.sort((left, right) => {
      const leftDate = new Date(left.exam.createdAt || 0).getTime();
      const rightDate = new Date(right.exam.createdAt || 0).getTime();
      if (sortBy === "oldest") return leftDate - rightDate;
      if (sortBy === "free")
        return (
          Number(left.premium) - Number(right.premium) || rightDate - leftDate
        );
      if (sortBy === "premium")
        return (
          Number(right.premium) - Number(left.premium) || rightDate - leftDate
        );
      if (sortBy === "completed")
        return (
          Number(Boolean(right.completedAttempt)) -
            Number(Boolean(left.completedAttempt)) || rightDate - leftDate
        );
      return rightDate - leftDate;
    });
  }, [activeTab, examRows, sortBy, sourceFilter]);

  if (loading) {
    return (
      <AppLayout
        title="Practice Exams"
        subtitle="Build confidence with timed papers and detailed score reviews."
      >
        <Loader label="Loading practice papers..." />
      </AppLayout>
    );
  }

  const emptyState = {
    ALL: {
      title: "No practice exams available",
      message:
        "Published practice papers will appear here as soon as they become available.",
    },
    FREE: {
      title: "No free tests found",
      message: "There are no free practice papers in the library right now.",
    },
    PREMIUM: {
      title: "No premium tests found",
      message:
        "Premium practice papers will appear in this collection when released.",
    },
    IN_PROGRESS: {
      title: "No tests in progress",
      message:
        "Start a practice paper and you can return here to continue it later.",
    },
    COMPLETED: {
      title: "No completed attempts yet",
      message:
        "Finish a practice exam to unlock its score report and detailed analytics.",
    },
  }[activeTab];

  return (
    <AppLayout
      title="Practice Exams"
      subtitle="Hone your skills with official-style papers. Complete a test to unlock detailed performance review."
    >
      <section className="practice-toolbar" aria-label="Practice exam filters">
        <div className="practice-tabs">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              <LordIcon
                src={icon}
                size={30}
                className="practice-tab-lordicon"
                trigger="loop"
                loading="lazy"
                stroke="bold"
                state="loop-rotate"
                colors={
                  activeTab === id
                    ? "primary:#ffffff,secondary:#93c5fd"
                    : "primary:#0b1f45,secondary:#356df3"
                }
              />
              {label}
              <span>{counts[id]}</span>
            </button>
          ))}
        </div>
        <PremiumSelect
          label="Sort"
          value={sortBy}
          options={sortOptions}
          onChange={setSortBy}
          ariaLabel="Sort practice exams"
          className="practice-sort"
        />
        <div className="practice-source-filter" aria-label="Exam source">
          {[
            { value: "ALL", label: "All sources" },
            { value: "MONOPREP", label: "MonoPrep Exams" },
            { value: "OFFICIAL", label: "Official Exams" },
          ].map((option) => (
            <button key={option.value} type="button" className={sourceFilter === option.value ? "active" : ""} onClick={() => setSourceFilter(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loadError ? (
        <div className="practice-load-alert" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <LordIcon
              src={lordIcons.progress}
              size={24}
              className="lordicon-inline"
              stroke="bold"
            />
            Retry
          </button>
        </div>
      ) : null}

      {visibleRows.length ? (
        <div className="paper-grid">
          {visibleRows.map((row) => (
            <ExamCard
              key={row.exam.id}
              row={row}
              canUsePremium={canUsePremium}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          media={
            <span className="empty-state-icon lordicon-empty">
              <LordIcon
                src={lordIcons.empty}
                size={58}
                trigger="loop"
                loading="lazy"
                stroke="bold"
                colors="primary:#0b1f45,secondary:#356df3"
              />
            </span>
          }
          title={emptyState.title}
          message={emptyState.message}
          actionLabel="View all papers"
          actionOnClick={() => {
            setActiveTab("ALL");
            setSourceFilter("ALL");
          }}
        />
      )}
    </AppLayout>
  );
}
