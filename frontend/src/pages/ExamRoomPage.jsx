import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExamLayout from "../layouts/ExamLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import ExamHeader from "../components/exam/ExamHeader.jsx";
import QuestionPalette from "../components/exam/QuestionPalette.jsx";
import PassagePanel from "../components/exam/PassagePanel.jsx";
import SectionIntro from "../components/exam/SectionIntro.jsx";
import SubmitConfirmModal from "../components/exam/SubmitConfirmModal.jsx";
import FormulaReferenceDialog from "../components/exam/FormulaReferenceDialog.jsx";
import CalculatorModal from "../components/exam/renderers/CalculatorModal.jsx";
import QuestionRenderer from "../components/question/QuestionRenderer.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import {
  completeAttemptSection,
  getAttempt,
  saveAnswer,
  submitAttempt,
} from "../services/attemptService.js";
import { generateFeedback } from "../services/aiService.js";
import { useExamStore } from "../store/examStore.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { useExamGuard } from "../hooks/useExamGuard.js";
import { useAuthStore } from "../store/authStore.js";
import { getCurrentQuestion } from "../utils/exam.js";

function clampSplit(value) {
  return Math.min(68, Math.max(32, value));
}

export default function ExamRoomPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [lineReaderActive, setLineReaderActive] = useState(false);
  const [activeDialog, setActiveDialog] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [expiredAttempt, setExpiredAttempt] = useState(false);
  const [lineReaderY, setLineReaderY] = useState(() => Math.round(window.innerHeight * 0.48));
  const [splitPercent, setSplitPercent] = useState(52);
  const [transitionSectionIndex, setTransitionSectionIndex] = useState(null);
  const [completedSectionForTransition, setCompletedSectionForTransition] =
    useState(null);
  const [banner, setBanner] = useState("");
  const advancingRef = useRef(false);
  const bodyRef = useRef(null);
  const answerSaveQueuesRef = useRef(new Map());

  const queueAnswerSave = useCallback((payload) => {
    const questionId = payload.questionId;
    const previousSave = answerSaveQueuesRef.current.get(questionId) || Promise.resolve();
    const queuedSave = previousSave
      .catch(() => undefined)
      .then(async () => {
        let lastError;
        for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
          try {
            return await saveAnswer(attemptId, payload);
          } catch (error) {
            lastError = error;
            if (error.response?.status === 409 || attemptNumber === 3) {
              break;
            }
            await new Promise((resolve) => window.setTimeout(resolve, attemptNumber * 400));
          }
        }
        throw lastError;
      })
      .catch((error) => {
        setBanner(
          error.response?.data?.message
            || "This answer is saved on this device but has not reached the server yet."
        );
        return null;
      });

    answerSaveQueuesRef.current.set(questionId, queuedSave);
    queuedSave.finally(() => {
      if (answerSaveQueuesRef.current.get(questionId) === queuedSave) {
        answerSaveQueuesRef.current.delete(questionId);
      }
    });
    return queuedSave;
  }, [attemptId]);

  const flushAnswerSaves = useCallback(async () => {
    await Promise.allSettled([...answerSaveQueuesRef.current.values()]);
  }, []);

  const completeCurrentSection = useCallback(async (sectionId) => {
    await flushAnswerSaves();
    const refreshedAttempt = await completeAttemptSection(attemptId, sectionId);
    setAttempt(refreshedAttempt);
    return refreshedAttempt;
  }, [attemptId, flushAnswerSaves]);

  const {
    sessions,
    initializeSession,
    updateSession,
    saveDraftAnswer,
    setReviewFlag,
    toggleEliminatedChoice,
    setExamNotes,
    incrementWarning,
    clearSession,
  } = useExamStore();

  const session = sessions[attemptId];

  useEffect(() => {
    async function loadAttempt() {
      const response = await getAttempt(attemptId);
      if (response.status !== "IN_PROGRESS") {
        navigate(`/attempts/${attemptId}/review`, { replace: true });
        return;
      }
      setAttempt(response);
      initializeSession(attemptId);
      if (response.expiresAt && new Date(response.expiresAt).getTime() <= Date.now()) {
        setExpiredAttempt(true);
      }
      setLoading(false);
    }

    loadAttempt().catch((error) => {
      setLoadError(
        error.response?.data?.message ||
          "Exam room could not be loaded. Please return to Practice Exams and try again."
      );
      setLoading(false);
    });
  }, [attemptId, initializeSession, navigate]);

  const sections = attempt?.exam.sections || [];
  const currentSection = sections[session?.currentSectionIndex || 0];
  const currentQuestion = getCurrentQuestion(
    currentSection,
    session?.currentQuestionIndex || 0
  );
  const isStudentProducedResponse = currentQuestion?.type === "text_input"
    || (currentSection?.type === "math" && !currentQuestion?.options?.length);
  const showPassagePanel = Boolean(currentQuestion?.passage) || isStudentProducedResponse;
  const currentSectionIndex = session?.currentSectionIndex || 0;
  const moduleNumber = currentSection
    ? sections
      .slice(0, currentSectionIndex + 1)
      .filter((section) => section.type === currentSection.type).length
    : 1;
  const officialSectionTitle = currentSection?.type === "math"
    ? `Section 2, Module ${moduleNumber}: Math`
    : currentSection?.type === "reading_writing"
      ? `Section 1, Module ${moduleNumber}: Reading and Writing`
      : currentSection?.title;
  useEffect(() => {
    if (!lineReaderActive) return undefined;
    const moveReader = (event) => setLineReaderY(Math.max(96, Math.min(window.innerHeight - 120, event.clientY)));
    window.addEventListener("pointermove", moveReader);
    return () => window.removeEventListener("pointermove", moveReader);
  }, [lineReaderActive]);

  const answerMap = useMemo(() => {
    const saved = Object.fromEntries(
      (attempt?.answers || []).map((answer) => [
        answer.questionId,
        answer.answer,
      ])
    );
    return {
      ...saved,
      ...(session?.draftAnswers || {}),
    };
  }, [attempt?.answers, session?.draftAnswers]);

  const reviewFlags = useMemo(() => {
    const saved = Object.fromEntries(
      (attempt?.answers || []).map((answer) => [
        answer.questionId,
        answer.markedForReview,
      ])
    );
    return {
      ...saved,
      ...(session?.reviewFlags || {}),
    };
  }, [attempt?.answers, session?.reviewFlags]);
  const eliminatedValues = currentQuestion
    ? session?.eliminatedChoices?.[currentQuestion.id] || []
    : [];
  const savedElapsed = session?.elapsedSections?.[currentSection?.id] || 0;
  const currentTarget = currentSection
    ? (session?.currentSectionStartedAt || Date.now()) +
      (currentSection.duration * 60 - savedElapsed) * 1000
    : 0;

  const handleTimeout = useCallback(async () => {
    if (!attempt || !currentSection || advancingRef.current) {
      return;
    }

    advancingRef.current = true;
    const elapsedSeconds = Math.min(
      currentSection.duration * 60,
      savedElapsed +
        Math.floor(
          (Date.now() - (session?.currentSectionStartedAt || Date.now())) / 1000
        )
    );

    updateSession(attemptId, {
      elapsedSections: {
        ...(session?.elapsedSections || {}),
        [currentSection.id]: elapsedSeconds,
      },
    });

    let refreshedAttempt;
    try {
      refreshedAttempt = await completeCurrentSection(currentSection.id);
    } catch (error) {
      setBanner(error.response?.data?.message || "The completed module could not be saved. Please try again.");
      advancingRef.current = false;
      return;
    }
    const refreshedSections = refreshedAttempt.exam.sections || [];
    const completedIndex = refreshedSections.findIndex((section) => section.id === currentSection.id);
    const nextIndex = completedIndex + 1;
    if (nextIndex >= refreshedSections.length) {
      setSubmitting(true);
      try {
        const submitted = await submitAttempt(attemptId);
        setAttempt(submitted);
        clearSession(attemptId);
        generateFeedback(attemptId).catch(() => null);
        navigate(`/attempts/${attemptId}/review`, { replace: true });
      } catch (error) {
        setBanner(error.response?.data?.message || "Submit failed. Please try again.");
        setSubmitting(false);
        advancingRef.current = false;
      }
      return;
    }

    beginSectionTransition(nextIndex, currentSection);
    setBanner("Time expired. Review this module, then continue when ready.");
    advancingRef.current = false;
  }, [
    attempt,
    attemptId,
    clearSession,
    completeCurrentSection,
    currentSection,
    navigate,
    savedElapsed,
    session?.currentSectionIndex,
    session?.currentSectionStartedAt,
    session?.elapsedSections,
    updateSession,
  ]);

  const remainingSeconds = useCountdown(currentTarget, handleTimeout);

  useExamGuard(Boolean(attempt), () => {
    incrementWarning(attemptId);
    setBanner("Tab switch detected. Stay focused on the exam window.");
  });

  async function persistAnswer(
    questionId,
    answer,
    markedForReview = reviewFlags[questionId] || false
  ) {
    saveDraftAnswer(attemptId, questionId, answer);
    await queueAnswerSave({
      questionId,
      answer,
      markedForReview,
    });
  }

  async function handleMarkForReview() {
    const currentValue = reviewFlags[currentQuestion.id] || false;
    const nextValue = !currentValue;
    setReviewFlag(attemptId, currentQuestion.id, nextValue);
    await queueAnswerSave({
      questionId: currentQuestion.id,
      answer: answerMap[currentQuestion.id] || {},
      markedForReview: nextValue,
    });
  }

  function handleToggleEliminated(label) {
    toggleEliminatedChoice(attemptId, currentQuestion.id, label);
  }

  const resizeExamPanels = useCallback((clientX) => {
    if (!bodyRef.current) {
      return;
    }

    const rect = bodyRef.current.getBoundingClientRect();
    const nextPercent = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(clampSplit(nextPercent));
  }, []);

  function handlePanelResizeStart(event) {
    if (window.innerWidth <= 1024) {
      return;
    }

    event.preventDefault();
    resizeExamPanels(event.clientX);

    const handleMove = (moveEvent) => resizeExamPanels(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  function handlePanelResizeKeyDown(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    setSplitPercent((value) =>
      clampSplit(value + (event.key === "ArrowRight" ? 3 : -3))
    );
  }

  function handleMenuAction(action) {
    setMoreOpen(false);

    if (action === "notes") {
      setNotesOpen((value) => !value);
      return;
    }

    if (action === "line-reader") {
      const nextValue = !lineReaderActive;
      setLineReaderActive(nextValue);
      setBanner(
        nextValue
          ? "Line reader is active. Use it to track one row at a time."
          : "Line reader turned off."
      );
      return;
    }

    setActiveDialog(action);
  }

  function getDialogCopy() {
    const answeredCount = currentSection.questions.filter((question) =>
      Boolean(
        answerMap[question.id]?.value || answerMap[question.id]?.values?.length
      )
    ).length;
    const reviewCount = currentSection.questions.filter(
      (question) => reviewFlags[question.id]
    ).length;
    const dialogs = {
      directions: {
        title: `${currentSection.title} directions`,
        body: [
          `Answer every question in this section. This module is timed for ${currentSection.duration} minutes.`,
          "Use Previous and Next to move between questions. Use the question selector to jump directly to any item.",
          "Mark for Review keeps a flag on the current question so you can return before submitting the section.",
        ],
        action: "Got it",
      },
      help: {
        title: "Exam help",
        body: [
          "Your work is saved automatically after every answer change.",
          "If a section timer reaches zero, the exam advances to the next section or submits the final section.",
          "Copy, paste, and page refresh are blocked during the exam to protect the test session.",
        ],
        action: "Close",
      },
      shortcuts: {
        title: "Keyboard shortcuts",
        body: [
          "Left / Right Arrow: move between questions.",
          "Alt + N: Notes. Alt + C: calculator in Math. Alt + R: Reference in Math.",
          "Escape closes the open exam tool. Tab and Enter remain available for keyboard navigation.",
        ],
        action: "Close",
      },
      assistive: {
        title: "Assistive technology",
        body: [
          "All core exam controls are keyboard reachable and expose button states where applicable.",
          "Audio questions use native audio controls. The line reader can be turned on from the More menu.",
          "Timer visibility can be toggled without stopping the timer.",
        ],
        action: "Close",
      },
      break: {
        title: "Unscheduled break",
        body: [
          "You can step away, but the section timer continues to run.",
          "Keep this page open. Returning to another tab may trigger a focus warning.",
          "Press Continue when you are ready to resume.",
        ],
        action: "Continue",
      },
      review: {
        title: "Section review",
        body: [
          `${answeredCount} of ${currentSection.questions.length} questions have an answer saved.`,
          `${reviewCount} question${
            reviewCount === 1 ? "" : "s"
          } marked for review.`,
          "Open the question selector again to jump directly to any unanswered or flagged item.",
        ],
        action: "Return to questions",
      },
      formula: {
        title: "Formula Reference",
        action: "Close",
      },
    };

    return dialogs[activeDialog];
  }

  function moveQuestion(delta) {
    const nextIndex = Math.min(
      Math.max((session?.currentQuestionIndex || 0) + delta, 0),
      currentSection.questions.length - 1
    );
    updateSession(attemptId, { currentQuestionIndex: nextIndex });
    setPaletteOpen(false);
  }

  function selectQuestion(index) {
    updateSession(attemptId, { currentQuestionIndex: index });
    setPaletteOpen(false);
  }

  useEffect(() => {
    function handleExamShortcut(event) {
      const target = event.target;
      if (target?.matches?.("input, textarea, [contenteditable='true']")) return;

      if (event.key === "Escape") {
        setActiveDialog(null);
        setMoreOpen(false);
        setPaletteOpen(false);
        setNotesOpen(false);
        setCalculatorOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveQuestion(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveQuestion(1);
        return;
      }
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        setNotesOpen((value) => !value);
      } else if (key === "c" && currentSection?.type === "math") {
        event.preventDefault();
        setCalculatorOpen((value) => !value);
      } else if (key === "r" && currentSection?.type === "math") {
        event.preventDefault();
        setActiveDialog((value) => value === "formula" ? null : "formula");
      }
    }

    window.addEventListener("keydown", handleExamShortcut);
    return () => window.removeEventListener("keydown", handleExamShortcut);
  }, [currentSection?.type, session?.currentQuestionIndex]);

  async function submitExpiredAttempt() {
    if (submitting) return;
    setSubmitting(true);
    setBanner("");
    try {
      await flushAnswerSaves();
      await submitAttempt(attemptId);
      clearSession(attemptId);
      navigate(`/attempts/${attemptId}/review`, { replace: true });
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        const current = await getAttempt(attemptId).catch(() => null);
        if (current?.status && current.status !== "IN_PROGRESS") {
          clearSession(attemptId);
          navigate(`/attempts/${attemptId}/review`, { replace: true });
          return;
        }
      }
      setBanner(error.response?.data?.message || "Saved answers could not be submitted yet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (session.currentQuestionIndex < currentSection.questions.length - 1) {
      moveQuestion(1);
      return;
    }

    setModalOpen(true);
  }

  function beginSectionTransition(index, completedSection) {
    setCompletedSectionForTransition(completedSection);
    setTransitionSectionIndex(index);
  }

  async function advanceSection() {
    if (!attempt || !currentSection || submitting) {
      return;
    }

    const elapsedSeconds = Math.min(
      currentSection.duration * 60,
      savedElapsed +
        Math.floor(
          (Date.now() - (session?.currentSectionStartedAt || Date.now())) / 1000
        )
    );

    updateSession(attemptId, {
      elapsedSections: {
        ...(session?.elapsedSections || {}),
        [currentSection.id]: elapsedSeconds,
      },
    });

    setModalOpen(false);

    setSubmitting(true);
    let refreshedAttempt;
    try {
      refreshedAttempt = await completeCurrentSection(currentSection.id);
    } catch (error) {
      setBanner(error.response?.data?.message || "The completed module could not be saved. Please try again.");
      setSubmitting(false);
      return;
    }
    const refreshedSections = refreshedAttempt.exam.sections || [];
    const completedIndex = refreshedSections.findIndex((section) => section.id === currentSection.id);
    const nextIndex = completedIndex + 1;

    if (nextIndex >= refreshedSections.length) {
      try {
        const submitted = await submitAttempt(attemptId);
        setAttempt(submitted);
        clearSession(attemptId);
        generateFeedback(attemptId).catch(() => null);
        navigate(`/attempts/${attemptId}/review`, { replace: true });
      } catch (error) {
        setBanner(error.response?.data?.message || "Submit failed. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(false);
    beginSectionTransition(nextIndex, currentSection);
  }

  if (loading) {
    return <Loader label="Launching exam room..." />;
  }

  if (
    loadError ||
    !attempt ||
    !session ||
    !currentSection ||
    !currentQuestion
  ) {
    return (
      <ExamLayout>
        <EmptyState
          title="Exam room unavailable"
          message={loadError || "This attempt could not be opened."}
          actionLabel="Back to practice"
          actionTo="/practice"
        />
      </ExamLayout>
    );
  }

  if (expiredAttempt) {
    return (
      <ExamLayout>
        <main className="expired-attempt-screen">
          <section className="expired-attempt-panel">
            <span className="expired-eyebrow">Time limit reached</span>
            <h1>Your exam time has ended</h1>
            <p>The exam room is locked, but every answer that reached the server is preserved. Submit them now to build your score report and review.</p>
            {banner ? <div className="exam-banner">{banner}</div> : null}
            <div className="expired-attempt-actions">
              <Button onClick={submitExpiredAttempt} disabled={submitting}>{submitting ? "Submitting saved answers..." : "Submit saved answers"}</Button>
              <Button variant="ghost" onClick={() => navigate("/practice")}>Back to practice</Button>
            </div>
          </section>
        </main>
      </ExamLayout>
    );
  }

  if (transitionSectionIndex !== null) {
    return (
      <ExamLayout>
        <SectionIntro
          section={sections[transitionSectionIndex]}
          completedSection={completedSectionForTransition}
          answers={answerMap}
          reviewFlags={reviewFlags}
          showScheduledBreak={completedSectionForTransition?.type === "reading_writing"
            && sections[transitionSectionIndex]?.type === "math"}
          onReviewQuestion={(questionIndex) => {
            const completedIndex = sections.findIndex((item) => item.id === completedSectionForTransition?.id);
            if (completedIndex < 0) return;
            updateSession(attemptId, {
              currentSectionIndex: completedIndex,
              currentQuestionIndex: questionIndex,
              currentSectionStartedAt: Date.now(),
            });
            setTransitionSectionIndex(null);
            setCompletedSectionForTransition(null);
          }}
          onContinue={() => {
            updateSession(attemptId, {
              currentSectionIndex: transitionSectionIndex,
              currentQuestionIndex: 0,
              currentSectionStartedAt: Date.now(),
            });
            setTransitionSectionIndex(null);
            setCompletedSectionForTransition(null);
          }}
        />
      </ExamLayout>
    );
  }

  const dialog = getDialogCopy();

  return (
    <ExamLayout className={lineReaderActive ? "line-reader-active" : ""}>
      <ExamHeader
        sectionTitle={officialSectionTitle}
        remainingSeconds={remainingSeconds}
        timerHidden={timerHidden}
        onToggleTimer={() => setTimerHidden((value) => !value)}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((value) => !value)}
        onShowDirections={() => setActiveDialog("directions")}
        showCalculatorTool={currentSection.type === "math"}
        calculatorOpen={calculatorOpen}
        onOpenCalculator={() => setCalculatorOpen(true)}
        showFormulaTool={currentSection.type === "math"}
        formulaOpen={activeDialog === "formula"}
        onOpenFormula={() => {
          setMoreOpen(false);
          setNotesOpen(false);
          setActiveDialog("formula");
        }}
        notesOpen={notesOpen}
        lineReaderActive={lineReaderActive}
        onMenuAction={handleMenuAction}
      />

      <div className="exam-divider-line" />
      <div className="practice-test-banner">THIS IS A PRACTICE TEST</div>
      {banner ? <div className="exam-banner">{banner}</div> : null}
      {lineReaderActive && !modalOpen && !activeDialog ? (
        <div className="line-reader-strip" style={{ top: `${lineReaderY}px` }} aria-hidden="true" />
      ) : null}

      <div
        ref={bodyRef}
        className={`bluebook-body section-${currentSection.type} ${
          showPassagePanel ? "" : "single-panel"
        }`.trim()}
        style={{ "--passage-width": `${splitPercent}%` }}
      >
        {showPassagePanel ? (
          <PassagePanel question={currentQuestion} attemptId={attemptId} sectionType={currentSection.type} />
        ) : null}
        {showPassagePanel ? (
          <div
            className="panel-resizer"
            role="separator"
            aria-label="Resize passage and question panels"
            aria-orientation="vertical"
            aria-valuemin={32}
            aria-valuemax={68}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onPointerDown={handlePanelResizeStart}
            onKeyDown={handlePanelResizeKeyDown}
          >
            <span aria-hidden="true" />
          </div>
        ) : null}
        <div className="exam-question-column">
          <QuestionRenderer
            section={currentSection}
            question={currentQuestion}
            value={answerMap[currentQuestion.id]}
            onChange={(answer) => persistAnswer(currentQuestion.id, answer)}
            questionNumber={session.currentQuestionIndex + 1}
            markedForReview={reviewFlags[currentQuestion.id]}
            onMarkForReview={handleMarkForReview}
            eliminatedValues={eliminatedValues}
            onToggleEliminated={handleToggleEliminated}
          />
        </div>
      </div>

      {notesOpen ? (
        <aside className="exam-notes-drawer" aria-label="Exam notes">
          <div className="notes-drawer-head">
            <div>
              <strong>Highlights & Notes</strong>
              <span>Saved on this device during the attempt.</span>
            </div>
            <button type="button" onClick={() => setNotesOpen(false)}>
              Close
            </button>
          </div>
          <textarea
            value={session.notes || ""}
            onChange={(event) => setExamNotes(attemptId, event.target.value)}
            placeholder="Write quick scratch notes here..."
          />
        </aside>
      ) : null}

      <footer className="exam-bottom-nav">
        <strong>{user?.fullName || "Student"}</strong>
        <div className="palette-anchor">
          <button
            type="button"
            className="question-selector-button"
            onClick={() => setPaletteOpen((value) => !value)}
          >
            Question {session.currentQuestionIndex + 1} of{" "}
            {currentSection.questions.length} <span>^</span>
          </button>
          <QuestionPalette
            open={paletteOpen}
            questions={currentSection.questions}
            currentQuestionId={currentQuestion.id}
            answers={answerMap}
            reviewFlags={reviewFlags}
            onSelect={selectQuestion}
            onReview={() => {
              setPaletteOpen(false);
              setActiveDialog("review");
            }}
          />
        </div>
        <div className="bottom-actions">
          <button
            type="button"
            className="bottom-secondary"
            onClick={() => moveQuestion(-1)}
            disabled={session.currentQuestionIndex === 0}
          >
            Previous
          </button>
          <button type="button" className="next-button" onClick={handleNext}>
            {submitting
              ? "Submitting..."
              : session.currentQuestionIndex ===
                currentSection.questions.length - 1
              ? session.currentSectionIndex === sections.length - 1
                ? "Submit"
                : "Next Section"
              : "Next"}
          </button>
        </div>
      </footer>

      <SubmitConfirmModal
        open={modalOpen}
        title={
          session.currentSectionIndex === sections.length - 1
            ? "Submit exam?"
            : "Submit section?"
        }
        message={
          session.currentSectionIndex === sections.length - 1
            ? "This will end the exam, calculate your score, and move you to review."
            : "You will move to the next timed section once you confirm."
        }
        onCancel={() => setModalOpen(false)}
        onConfirm={advanceSection}
        confirmLabel={
          session.currentSectionIndex === sections.length - 1
            ? "Submit exam"
            : "Continue"
        }
        pending={submitting}
      />
      <FormulaReferenceDialog
        open={activeDialog === "formula"}
        onClose={() => setActiveDialog(null)}
      />
      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      <Modal
        open={Boolean(dialog) && activeDialog !== "formula"}
        title={dialog?.title}
        actions={
          <Button
            onClick={() => {
              if (activeDialog === "break") {
                setBanner("Break closed. Timer continued while you were away.");
              }
              setActiveDialog(null);
            }}
          >
            {dialog?.action || "Close"}
          </Button>
        }
      >
        {dialog?.referenceText ? (
          <div className="formula-reference-dialog">
            <p>{dialog.referenceText}</p>
          </div>
        ) : (
          <ul className="clean-list">
            {(dialog?.body || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </Modal>
      <SubmitConfirmModal
        open={activeDialog === "exit"}
        title="Exit the exam?"
        message="Your saved answers will remain in this attempt. You can resume from the Attempts page."
        onCancel={() => setActiveDialog(null)}
        onConfirm={() => navigate("/attempts")}
        confirmLabel="Exit exam"
      />
      {submitting ? (
        <div className="submit-overlay" role="status" aria-live="polite">
          <Loader label="Submitting and building your score report..." />
        </div>
      ) : null}
    </ExamLayout>
  );
}
