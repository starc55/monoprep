import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useAuthBootstrap } from './hooks/useAuth.js';
import Loader from './components/ui/Loader.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const PracticePage = lazy(() => import('./pages/PracticePage.jsx'));
const SupportPage = lazy(() => import('./pages/SupportPage.jsx'));
const SupportSessionsPage = lazy(() => import('./pages/SupportSessionsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AttemptsPage = lazy(() => import('./pages/AttemptsPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const CompetitionPage = lazy(() => import('./pages/CompetitionPage.jsx'));
const QuestionHubPage = lazy(() => import('./pages/QuestionHubPage.jsx'));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const ExamInstructionsPage = lazy(() => import('./pages/ExamInstructionsPage.jsx'));
const ExamRoomPage = lazy(() => import('./pages/ExamRoomPage.jsx'));
const ExamReviewPage = lazy(() => import('./pages/ExamReviewPage.jsx'));
const AIFeedbackPage = lazy(() => import('./pages/AIFeedbackPage.jsx'));
const AdminPanelPage = lazy(() => import('./pages/AdminPanelPage.jsx'));
const AdminExamsPage = lazy(() => import('./pages/AdminExamsPage.jsx'));
const AdminQuestionsPage = lazy(() => import('./pages/AdminQuestionsPage.jsx'));
const AdminQuestionBankPage = lazy(() => import('./pages/AdminQuestionBankPage.jsx'));
const AdminPassagesPage = lazy(() => import('./pages/AdminPassagesPage.jsx'));
const AdminMentorsPage = lazy(() => import('./pages/AdminMentorsPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx'));
const AdminAttemptsPage = lazy(() => import('./pages/AdminAttemptsPage.jsx'));
const AdminStatsPage = lazy(() => import('./pages/AdminStatsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'ADMIN' ? children : <Navigate to="/dashboard" replace />;
}

function StudentRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : children;
}

function RoleRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  useAuthBootstrap();
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return <Loader label="Loading your workspace..." />;
  }

  return (
    <Suspense fallback={<Loader label="Loading your workspace..." />}>
      <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <DashboardPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <PracticePage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attempts"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <AttemptsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/question-hub"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <QuestionHubPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vocabulary"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <VocabularyPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/competition"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <CompetitionPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support-sessions"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <SupportSessionsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support-sessions/schedules"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <SupportSessionsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support-sessions/mentors"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <SupportSessionsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <ProfilePage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <SupportPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/:examId/instructions"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <ExamInstructionsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attempts/:attemptId/exam"
        element={
          <ProtectedRoute>
            <ExamRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attempts/:attemptId/review"
        element={
          <ProtectedRoute>
            <ExamReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attempts/:attemptId/ai-feedback"
        element={
          <ProtectedRoute>
            <AIFeedbackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <AnalyticsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <SettingsPage />
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPanelPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/exams"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminExamsPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminQuestionsPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/question-hub"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminQuestionBankPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/passages"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPassagesPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mentors"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminMentorsPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attempts"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminAttemptsPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stats"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminStatsPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
