import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "../layouts/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Loader from "../components/ui/Loader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import LordIcon from "../components/ui/LordIcon.jsx";
import DashboardArt from "../components/dashboard/DashboardArt.jsx";
import AnalyticsScoreTable from "../components/analytics/AnalyticsScoreTable.jsx";
import {
  getLeaderboard,
  getMyAnalytics,
} from "../services/analyticsService.js";
import { useAuthStore } from "../store/authStore.js";
import { formatSeconds } from "../utils/format.js";
import { dashboardAssets } from "../data/dashboardAssets.js";

const analyticsIconMap = {
  score: "https://cdn.lordicon.com/oqhqyeud.json",
  reading: "https://cdn.lordicon.com/rrbmabsx.json",
  math: "https://cdn.lordicon.com/ayjfxoly.json",
  accuracy: "https://cdn.lordicon.com/oqhqyeud.json",
  correct: "https://cdn.lordicon.com/lvrxlmju.json",
  incorrect: "https://cdn.lordicon.com/upkivhua.json",
  time: "https://cdn.lordicon.com/abfverha.json",
  leaderboard: "https://cdn.lordicon.com/vttzorhw.json",
  performance: "https://cdn.lordicon.com/lewtedlh.json",
  download: "https://cdn.lordicon.com/tsrgicte.json",
};

const domainCatalog = {
  reading: {
    label: "Reading and Writing",
    iconName: "reading",
    rows: [
      {
        label: "Craft and Structure",
        patterns: [
          "craft",
          "structure",
          "context",
          "vocabulary",
          "words",
          "purpose",
        ],
      },
      {
        label: "Information and Ideas",
        patterns: [
          "information",
          "idea",
          "central",
          "evidence",
          "inference",
          "command",
        ],
      },
      {
        label: "Standard English Conventions",
        patterns: [
          "standard",
          "english",
          "convention",
          "grammar",
          "punctuation",
          "sentence",
        ],
      },
      {
        label: "Expression of Ideas",
        patterns: [
          "expression",
          "transition",
          "rhetorical",
          "organization",
          "revision",
        ],
      },
    ],
  },
  math: {
    label: "Math",
    iconName: "math",
    rows: [
      {
        label: "Algebra",
        patterns: ["algebra", "linear", "equation", "inequality", "system"],
      },
      {
        label: "Advanced Math",
        patterns: [
          "advanced",
          "quadratic",
          "polynomial",
          "function",
          "exponential",
        ],
      },
      {
        label: "Problem Solving and Data Analysis",
        patterns: [
          "problem",
          "data",
          "statistic",
          "ratio",
          "percent",
          "probability",
        ],
      },
      {
        label: "Geometry and Trigonometry",
        patterns: [
          "geometry",
          "trigonometry",
          "circle",
          "triangle",
          "angle",
          "area",
          "volume",
        ],
      },
    ],
  },
};

function AnalyticsLordIcon({
  name,
  size = 48,
  className = "",
  trigger = "loop",
  colors,
}) {
  return (
    <span className={`analytics-lord-icon ${className}`.trim()}>
      <LordIcon
        src={analyticsIconMap[name] || analyticsIconMap.score}
        size={size}
        trigger={trigger}
        loading="lazy"
        colors={colors}
      />
    </span>
  );
}

function normalizeLabel(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "");
}

function scoreToSatTotal(value) {
  if (!value) return 400;
  return value > 100 ? value : Math.round(400 + (value / 100) * 1200);
}

function scoreToSatSection(value) {
  if (!value) return 200;
  return value > 100 ? value : Math.round(200 + (value / 100) * 600);
}

function scoreProgress(value, max) {
  return Math.min(100, Math.round(((value || 0) / max) * 100));
}

function buildDomainRows(skillRows, catalogRows) {
  return catalogRows.map((domain) => {
    const matches = skillRows.filter((skill) => {
      const normalized = normalizeLabel(skill.skill);
      return (
        normalizeLabel(skill.skill) === normalizeLabel(domain.label) ||
        domain.patterns.some((pattern) =>
          normalized.includes(normalizeLabel(pattern))
        )
      );
    });
    const totalQuestions = matches.reduce(
      (sum, item) => sum + (item.totalQuestions || 0),
      0
    );
    const correct = matches.reduce(
      (sum, item) =>
        sum +
        Math.round(((item.totalQuestions || 0) * (item.accuracy || 0)) / 100),
      0
    );
    const accuracy = totalQuestions
      ? Math.round((correct / totalQuestions) * 100)
      : 0;
    return {
      ...domain,
      totalQuestions,
      correct,
      accuracy,
      score: scoreToSatSection(accuracy),
    };
  });
}

function scrollToSection(id) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sanitizePdfText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value = "") {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfText(x, y, text, size = 11, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`;
}

function pdfRect(x, y, width, height, mode = "S") {
  return `${x} ${y} ${width} ${height} re ${mode}\n`;
}

function pdfLine(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function createPdfDocument(pageStreams) {
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageStreams
      .map((_, index) => `${3 + index * 2} 0 R`)
      .join(" ")}] /Count ${pageStreams.length} >>`
  );

  pageStreams.forEach((stream, index) => {
    const pageObjectId = 3 + index * 2;
    const streamObjectId = pageObjectId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${streamObjectId} 0 R >>`
    );
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function addReportDomainCard(row, x, y, width) {
  const filledSegments = Math.min(
    7,
    Math.max(0, Math.ceil((row.accuracy || 0) / 15))
  );
  const segmentWidth = (width - 12) / 7;
  let content = "0.82 0.87 0.94 RG 1 w\n";
  content += pdfRect(x, y, width, 60);
  content += "0.04 0.08 0.18 rg\n";
  content += pdfText(
    x + 9,
    y + 42,
    sanitizePdfText(row.label).slice(0, 31),
    9.5,
    "F2"
  );
  content += pdfText(
    x + 9,
    y + 29,
    `${row.accuracy}% accuracy, ${row.totalQuestions} questions`,
    8.5
  );
  content += pdfText(x + 9, y + 17, `Domain Score: ${row.score}`, 8.5, "F2");

  Array.from({ length: 7 }).forEach((_, index) => {
    const segmentX = x + 9 + index * (segmentWidth + 2);
    if (index < filledSegments) {
      content += "0.15 0.39 0.92 rg\n";
      content += pdfRect(segmentX, y + 7, segmentWidth, 6, "f");
    } else {
      content += "0.88 0.91 0.96 RG\n";
      content += pdfRect(segmentX, y + 7, segmentWidth, 6);
    }
  });

  return content;
}

function buildAnalyticsPdf({ user, summary, domains }) {
  const studentName = user?.email || user?.fullName || "MonoPrep student";
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const domainList = domains.slice(0, 8);
  const columns = [
    { x: 250, width: 145 },
    { x: 407, width: 145 },
  ];
  const rowY = [494, 420, 346, 272];
  let page = "0.04 0.08 0.18 RG 0.9 w\n";

  page += "0.04 0.08 0.18 rg\n";
  page += pdfText(60, 728, "MONO", 21, "F2");
  page += "0.15 0.39 0.92 rg\n";
  page += pdfText(60, 707, "Prep", 21, "F2");
  page += "0.04 0.08 0.18 rg\n";
  page += pdfText(166, 730, `Name: ${studentName}`, 11, "F2");
  page += pdfText(
    166,
    714,
    `Generated from MonoPrep analytics - ${generatedDate}`,
    9
  );
  page += "0.15 0.39 0.92 RG 1.3 w\n";
  page += pdfLine(56, 686, 556, 686);
  page += "0.04 0.08 0.18 rg\n";
  page += pdfText(56, 654, "Your Scores", 25, "F2");
  page += "0.62 0.69 0.80 RG 1 w\n";
  page += pdfRect(56, 96, 500, 536);

  page += pdfText(74, 596, "SAT Scores", 17, "F2");
  page += pdfText(74, 564, "Total Score", 11, "F2");
  page += pdfText(74, 522, summary.totalScore, 40, "F2");
  page += pdfText(74, 505, "400-1600", 8.5);
  page += pdfText(74, 476, "Reading and Writing", 11, "F2");
  page += pdfText(74, 442, summary.readingScore, 27, "F2");
  page += pdfText(74, 407, "Math", 11, "F2");
  page += pdfText(74, 373, summary.mathScore, 27, "F2");
  page += pdfText(74, 322, `Accuracy: ${summary.accuracy}%`, 10, "F2");
  page += pdfText(74, 304, `Correct: ${summary.correctAnswers}`, 10);
  page += pdfText(74, 288, `Incorrect: ${summary.incorrectAnswers}`, 10);
  page += pdfText(
    74,
    272,
    `Time spent: ${formatSeconds(summary.timeSpent)}`,
    10
  );

  page += pdfText(250, 596, "Knowledge and Skills", 17, "F2");
  page += pdfText(
    250,
    574,
    "Performance across the 8 SAT content domains.",
    9.5
  );
  domainList.forEach((row, index) => {
    const column = columns[index % 2];
    const y = rowY[Math.floor(index / 2)];
    page += addReportDomainCard(row, column.x, y, column.width);
  });

  page += "0.45 0.51 0.62 rg\n";
  page += pdfText(56, 62, "MonoPrep SAT Analytics Report", 9);
  page += pdfText(472, 62, "Page 1 of 1", 9);

  return createPdfDocument([page]);
}

function downloadPdf(filename, pdfContent) {
  const blob = new Blob([pdfContent], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [activeSection, setActiveSection] = useState("score-summary");

  useEffect(() => {
    Promise.all([
      getMyAnalytics().catch(() => null),
      getLeaderboard().catch(() => null),
    ])
      .then(([analyticsResponse, leaderboardResponse]) => {
        setAnalytics(analyticsResponse);
        setLeaderboard(leaderboardResponse);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const sectionIds = [
      "score-summary",
      "performance-summary",
      "leaderboard-section",
      "domain-performance",
      "question-review",
    ];

    function updateActiveSection() {
      const current = sectionIds
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { id, distance: Math.abs(rect.top - 126), top: rect.top };
        })
        .filter(Boolean)
        .sort((left, right) => left.distance - right.distance)[0];

      if (current) setActiveSection(current.id);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [loading]);

  useEffect(() => {
    if (loading || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    window.setTimeout(() => {
      setActiveSection(id);
      scrollToSection(id);
    }, 120);
  }, [loading]);

  const summary = useMemo(() => {
    const skillRows = analytics?.accuracyBySkill || [];
    const totalQuestions = skillRows.reduce(
      (total, item) => total + (item.totalQuestions || 0),
      0
    );
    const correctAnswers = skillRows.reduce(
      (total, item) =>
        total +
        Math.round(((item.totalQuestions || 0) * (item.accuracy || 0)) / 100),
      0
    );
    const timeSpent = (analytics?.timePerSection || []).reduce(
      (total, item) => total + (item.seconds || 0),
      0
    );
    const latest = analytics?.scoreHistory?.at(-1) || null;
    const totalScore = scoreToSatTotal(
      latest?.totalScore ?? analytics?.overview?.bestScore
    );
    const readingScore = scoreToSatSection(latest?.readingWritingScore);
    const mathScore = scoreToSatSection(latest?.mathScore);

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: Math.max(0, totalQuestions - correctAnswers),
      accuracy: totalQuestions
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0,
      timeSpent,
      latest,
      totalScore,
      readingScore,
      mathScore,
      bestScore: scoreToSatTotal(analytics?.overview?.bestScore),
    };
  }, [analytics]);

  const domainRows = useMemo(
    () => ({
      reading: buildDomainRows(
        analytics?.accuracyBySkill || [],
        domainCatalog.reading.rows
      ),
      math: buildDomainRows(
        analytics?.accuracyBySkill || [],
        domainCatalog.math.rows
      ),
    }),
    [analytics]
  );

  if (loading) {
    return (
      <AppLayout
        title="Analytics"
        subtitle="Review your performance and identify the skills to improve next."
      >
        <Loader label="Loading analytics..." />
      </AppLayout>
    );
  }

  if (!analytics || !analytics.overview.attemptsTaken) {
    return (
      <AppLayout
        title="Analytics"
        subtitle="Review your performance and identify the skills to improve next."
      >
        <EmptyState
          media={
            <span className="empty-state-icon analytics-empty-icon">
              <AnalyticsLordIcon name="performance" size={58} />
            </span>
          }
          title="No analytics yet"
          message="Complete a practice exam to unlock scores, skill accuracy and personalised pacing insights."
          actionLabel="Start a practice exam"
          actionTo="/practice"
        />
      </AppLayout>
    );
  }

  const navItems = [
    ["score-summary", "Scores"],
    ["performance-summary", "Performance"],
    ["leaderboard-section", "Leaderboard"],
    ["domain-performance", "Domains"],
    ["question-review", "Question Review"],
  ];
  const sectionMotion = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.18 },
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <AppLayout
      title="Analytics"
      subtitle="One continuous score report with leaderboard, domains and review history."
    >
      <div className="analytics-report-actions">
        <div
          className="dsat-results-tabs analytics-scroll-nav"
          aria-label="Analytics sections"
        >
          {navItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeSection === key ? "active" : ""}
              onClick={() => {
                setActiveSection(key);
                scrollToSection(key);
              }}
            >
              {activeSection === key ? (
                <motion.span
                  layoutId="analytics-active-pill"
                  className="analytics-active-pill"
                />
              ) : null}
              <span className="analytics-tab-label">{label}</span>
            </button>
          ))}
        </div>
        <Button
          className="analytics-download-button"
          onClick={() =>
            downloadPdf(
              `MonoPrep_SAT_Report_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`,
              buildAnalyticsPdf({
                user,
                summary,
                domains: [...domainRows.reading, ...domainRows.math],
              })
            )
          }
        >
          <AnalyticsLordIcon
            name="download"
            size={30}
            colors="primary:#ffffff,secondary:#dbeafe"
          />
          <span>Download Report</span>
        </Button>
      </div>

      <motion.section
        id="score-summary"
        className="analytics-section analytics-overview dsat-score-overview"
        {...sectionMotion}
      >
        <Card className="section-score-card analytics-score-card">
          <span className="analytics-score-card-kicker">
            <AnalyticsLordIcon name="reading" size={52} />
            Reading & Writing
          </span>
          <strong>
            {summary.readingScore}
            <small>/800</small>
          </strong>
          <ProgressBar
            value={scoreProgress(summary.readingScore, 800)}
            tone="violet"
          />
          <p>
            {summary.correctAnswers} Correct, {summary.incorrectAnswers} Wrong
          </p>
        </Card>
        <Card className="overall-score-card dsat-total-score-card analytics-score-card">
          <span className="score-card-label analytics-score-card-kicker">
            <AnalyticsLordIcon name="score" size={54} />
            Total Score
          </span>
          <strong>
            {summary.totalScore}
            <small>/1600</small>
          </strong>
          <ProgressBar value={scoreProgress(summary.totalScore, 1600)} />
          <p>
            Best recorded score: <b>{summary.bestScore}</b>
          </p>
        </Card>
        <Card className="section-score-card analytics-score-card">
          <span className="analytics-score-card-kicker">
            <AnalyticsLordIcon name="math" size={52} />
            Math
          </span>
          <strong>
            {summary.mathScore}
            <small>/800</small>
          </strong>
          <ProgressBar
            value={scoreProgress(summary.mathScore, 800)}
            tone="cyan"
          />
          <p>{summary.totalQuestions} questions reviewed</p>
        </Card>
      </motion.section>

      <motion.section
        id="performance-summary"
        className="analytics-section analytics-metric-strip"
        {...sectionMotion}
      >
        <StatCard
          art={dashboardAssets.exam}
          label="Total Questions"
          value={summary.totalQuestions}
        />
        <StatCard
          art={dashboardAssets.target}
          tone="green"
          label="Correct Answers"
          value={summary.correctAnswers}
        />
        <StatCard
          art={dashboardAssets.pen}
          tone="red"
          label="Incorrect Answers"
          value={summary.incorrectAnswers}
        />
        <StatCard
          art={dashboardAssets.chart}
          tone="violet"
          label="Overall Accuracy"
          value={`${summary.accuracy}%`}
        />
        <StatCard
          art={dashboardAssets.fire}
          tone="amber"
          label="Time Spent"
          value={formatSeconds(summary.timeSpent)}
        />
      </motion.section>

      <motion.section
        id="leaderboard-section"
        className="analytics-section"
        {...sectionMotion}
      >
        <Card
          title="Leaderboard"
          className="leaderboard-card gamified-leaderboard analytics-leaderboard"
        >
          <DashboardArt
            src={dashboardAssets.score}
            className="analytics-card-art analytics-leaderboard-art"
          />
          <div className="leaderboard-summary">
            <span>
              <AnalyticsLordIcon name="leaderboard" size={42} />{" "}
              {leaderboard?.participants || 0} participants total
            </span>
            {leaderboard?.currentUser ? (
              <b>Your position: #{leaderboard.currentUser.rank}</b>
            ) : (
              <b>Submit a test to enter the board</b>
            )}
          </div>
          <div className="leaderboard-list">
            {(leaderboard?.top || []).length ? (
              (leaderboard.top || []).map((row) => (
                <article
                  key={`${row.userId}-${row.rank}`}
                  className={
                    row.isCurrentUser
                      ? "leaderboard-row current"
                      : "leaderboard-row"
                  }
                >
                  <span className="leaderboard-rank">
                    {row.rank <= 3 ? (
                      <AnalyticsLordIcon name="leaderboard" size={38} />
                    ) : (
                      row.rank
                    )}
                  </span>
                  <div>
                    <strong>{row.name}</strong>
                    <span>
                      R&W: {scoreToSatSection(row.readingWritingScore)} - Math:{" "}
                      {scoreToSatSection(row.mathScore)}
                    </span>
                  </div>
                  <b>{scoreToSatTotal(row.score)}</b>
                </article>
              ))
            ) : (
              <p className="helper-copy">
                Leaderboard will appear after students submit scored attempts.
              </p>
            )}
          </div>
        </Card>
      </motion.section>

      <motion.section
        id="domain-performance"
        className="analytics-section"
        {...sectionMotion}
      >
        <Card className="domain-performance-card">
          <div className="skills-header">
            <div>
              <h2>Domain Performance</h2>
              <p>Your performance across all knowledge domains.</p>
            </div>
          </div>
          <div className="domain-stick-groups">
            {Object.entries(domainCatalog).map(([key, catalog]) => {
              return (
                <div key={key} className="domain-stick-group">
                  <h3>
                    <AnalyticsLordIcon name={catalog.iconName} size={44} />{" "}
                    {catalog.label}
                  </h3>
                  {domainRows[key].map((row) => (
                    <article key={row.label} className="domain-stick-card">
                      <div>
                        <h4>{row.label}</h4>
                        <span>
                          {row.correct} / {row.totalQuestions} Correct
                        </span>
                      </div>
                      <strong>
                        {row.accuracy}
                        <small>%</small>
                      </strong>
                      <div className="domain-score-line">
                        <span>Score: 200</span>
                        <span>800</span>
                      </div>
                      <div
                        className="domain-segments"
                        aria-label={`${row.label} score ${row.score}`}
                      >
                        {Array.from({ length: 7 }).map((_, index) => (
                          <i
                            key={`${row.label}-${index}`}
                            className={
                              index < Math.ceil(row.accuracy / 15)
                                ? "filled"
                                : ""
                            }
                          />
                        ))}
                      </div>
                      <div className="domain-card-foot">
                        <span>
                          Domain Score: <b>{row.score}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() => scrollToSection("question-review")}
                        >
                          See next level &rarr;
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.section>

      <motion.section
        id="question-review"
        className="analytics-section"
        {...sectionMotion}
      >
        <Card
          title="Score history"
          className="analytics-history analytics-art-card"
        >
          <DashboardArt
            src={dashboardAssets.chart}
            className="analytics-card-art analytics-history-art"
          />
          <AnalyticsScoreTable items={analytics.scoreHistory} />
        </Card>
      </motion.section>

      <section
        className="sat-report-sheet analytics-print-sheet"
        aria-label="Printable SAT score report"
      >
        <header>
          <div>
            <strong>
              Name: {user?.email || user?.fullName || "MonoPrep student"}
            </strong>
            <span>Report generated from MonoPrep analytics</span>
          </div>
        </header>
        <h2>Your Scores</h2>
        <div className="sat-report-box">
          <div className="sat-report-scores">
            <h3>SAT Scores</h3>
            <span>Total Score</span>
            <strong>{summary.totalScore}</strong>
            <small>400-1600</small>
            <span>Reading and Writing</span>
            <b>{summary.readingScore}</b>
            <span>Math</span>
            <b>{summary.mathScore}</b>
          </div>
          <div className="sat-report-skills">
            <h3>Knowledge and Skills</h3>
            <p>
              View your performance across the 8 content domains measured on the
              SAT.
            </p>
            <div className="sat-report-domain-grid">
              {[...domainRows.reading, ...domainRows.math].map((row) => (
                <article
                  key={`print-${row.label}`}
                  className="sat-report-domain-card"
                >
                  <strong>{row.label}</strong>
                  <span>
                    ({row.accuracy}% accuracy, {row.totalQuestions} questions)
                  </span>
                  <small>Domain Score: {row.score}</small>
                  <div className="report-mini-segments">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <i
                        key={`${row.label}-print-${index}`}
                        className={
                          index < Math.ceil(row.accuracy / 15) ? "filled" : ""
                        }
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
