import { create } from 'zustand';

const storageKey = 'monoprep-exam-sessions';

function readSessions() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (error) {
    return {};
  }
}

function writeSessions(sessions) {
  localStorage.setItem(storageKey, JSON.stringify(sessions));
}

export const useExamStore = create((set, get) => ({
  sessions: readSessions(),
  initializeSession: (attemptId) => {
    const sessions = get().sessions;
    if (sessions[attemptId]) {
      return;
    }

    const nextSessions = {
      ...sessions,
      [attemptId]: {
        currentSectionIndex: 0,
        currentQuestionIndex: 0,
        currentSectionStartedAt: Date.now(),
        elapsedSections: {},
        reviewFlags: {},
        draftAnswers: {},
        eliminatedChoices: {},
        notes: '',
        warningCount: 0
      }
    };

    writeSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  updateSession: (attemptId, patch) => {
    const sessions = get().sessions;
    const nextSessions = {
      ...sessions,
      [attemptId]: {
        ...(sessions[attemptId] || {}),
        ...patch
      }
    };
    writeSessions(nextSessions);
    set({ sessions: nextSessions });
  },
  saveDraftAnswer: (attemptId, questionId, answer) => {
    const session = get().sessions[attemptId] || {};
    get().updateSession(attemptId, {
      draftAnswers: {
        ...(session.draftAnswers || {}),
        [questionId]: answer
      }
    });
  },
  setReviewFlag: (attemptId, questionId, value) => {
    const session = get().sessions[attemptId] || {};
    get().updateSession(attemptId, {
      reviewFlags: {
        ...(session.reviewFlags || {}),
        [questionId]: value
      }
    });
  },
  toggleEliminatedChoice: (attemptId, questionId, label) => {
    const session = get().sessions[attemptId] || {};
    const current = session.eliminatedChoices?.[questionId] || [];
    const next = current.includes(label)
      ? current.filter((entry) => entry !== label)
      : [...current, label];

    get().updateSession(attemptId, {
      eliminatedChoices: {
        ...(session.eliminatedChoices || {}),
        [questionId]: next
      }
    });
  },
  setExamNotes: (attemptId, notes) => {
    get().updateSession(attemptId, { notes });
  },
  incrementWarning: (attemptId) => {
    const session = get().sessions[attemptId] || {};
    get().updateSession(attemptId, {
      warningCount: (session.warningCount || 0) + 1
    });
  },
  clearSession: (attemptId) => {
    const nextSessions = { ...get().sessions };
    delete nextSessions[attemptId];
    writeSessions(nextSessions);
    set({ sessions: nextSessions });
  }
}));
