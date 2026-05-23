import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PracticePage from './pages/PracticePage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import ExamInstructionsPage from './pages/ExamInstructionsPage.jsx';
import ExamRoomPage from './pages/ExamRoomPage.jsx';
import ExamReviewPage from './pages/ExamReviewPage.jsx';
import AIFeedbackPage from './pages/AIFeedbackPage.jsx';
import AdminPanelPage from './pages/AdminPanelPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { useAuthStore } from './store/authStore.js';
import { useAuthBootstrap } from './hooks/useAuth.js';
import Loader from './components/ui/Loader.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminExamsPage from './pages/AdminExamsPage.jsx';
import AdminQuestionsPage from './pages/AdminQuestionsPage.jsx';
import AdminPassagesPage from './pages/AdminPassagesPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminAttemptsPage from './pages/AdminAttemptsPage.jsx';
import AdminStatsPage from './pages/AdminStatsPage.jsx';

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
        element={<Navigate to="/practice" replace />}
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
        element={<Navigate to="/practice" replace />}
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
  );
}
