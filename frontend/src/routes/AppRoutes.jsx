import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AdminRoute,
  RoleRedirect,
  StudentRoute,
  TeacherAccountRoute,
  TeacherRoute,
} from "./routeGuards.jsx";

const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const LandingPage = lazy(() => import("../pages/LandingPage.jsx"));
const ProductSelectPage = lazy(() => import("../pages/ProductSelectPage.jsx"));
const RegisterPage = lazy(() => import("../pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage.jsx"));
const AuthCallbackPage = lazy(() => import("../pages/AuthCallbackPage.jsx"));
const LegalPage = lazy(() => import("../pages/LegalPage.jsx"));
const DashboardPage = lazy(() => import("../pages/DashboardPage.jsx"));
const PracticePage = lazy(() => import("../pages/PracticePage.jsx"));
const DesmosHackPage = lazy(() => import("../pages/DesmosHackPage.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));
const AttemptsPage = lazy(() => import("../pages/AttemptsPage.jsx"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage.jsx"));
const CompetitionPage = lazy(() => import("../pages/CompetitionPage.jsx"));
const StudentsPage = lazy(() => import("../pages/StudentsPage.jsx"));
const StudentProfilePage = lazy(() => import("../pages/StudentProfilePage.jsx"));
const LeaderboardPage = lazy(() => import("../pages/LeaderboardPage.jsx"));
const QuestionHubPage = lazy(() => import("../pages/QuestionHubPage.jsx"));
const VocabularyPage = lazy(() => import("../pages/VocabularyPage.jsx"));
const SettingsPage = lazy(() => import("../pages/SettingsPage.jsx"));
const ExamInstructionsPage = lazy(() => import("../pages/ExamInstructionsPage.jsx"));
const ExamRoomPage = lazy(() => import("../pages/ExamRoomPage.jsx"));
const ExamReviewPage = lazy(() => import("../pages/ExamReviewPage.jsx"));
const AIFeedbackPage = lazy(() => import("../pages/AIFeedbackPage.jsx"));
const AdminPanelPage = lazy(() => import("../pages/AdminPanelPage.jsx"));
const AdminExamsPage = lazy(() => import("../pages/AdminExamsPage.jsx"));
const AdminPassagesPage = lazy(() => import("../pages/AdminPassagesPage.jsx"));
const AdminDesmosLessonsPage = lazy(() => import("../pages/AdminDesmosLessonsPage.jsx"));
const AdminUsersPage = lazy(() => import("../pages/AdminUsersPage.jsx"));
const AdminStatsPage = lazy(() => import("../pages/AdminStatsPage.jsx"));
const AdminTeachersPage = lazy(() => import("../pages/AdminTeachersPage.jsx"));
const TeacherPortalPage = lazy(() => import("../pages/TeacherPortalPage.jsx"));
const TeacherPendingPage = lazy(() => import("../pages/TeacherPendingPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));

const studentRoutes = [
  ["/dashboard", DashboardPage],
  ["/practice", PracticePage],
  ["/desmos-hack", DesmosHackPage],
  ["/attempts", AttemptsPage],
  ["/question-hub", QuestionHubPage],
  ["/vocabulary", VocabularyPage],
  ["/competition", CompetitionPage],
  ["/students", StudentsPage],
  ["/students/:id", StudentProfilePage],
  ["/leaderboard", LeaderboardPage],
  ["/profile", ProfilePage],
  ["/exams/:examId/instructions", ExamInstructionsPage],
  ["/attempts/:attemptId/exam", ExamRoomPage],
  ["/attempts/:attemptId/review", ExamReviewPage],
  ["/attempts/:attemptId/ai-feedback", AIFeedbackPage],
  ["/analytics", AnalyticsPage],
  ["/settings", SettingsPage],
];

const adminRoutes = [
  ["/admin", AdminPanelPage],
  ["/admin/exams", AdminExamsPage],
  ["/admin/passages", AdminPassagesPage],
  ["/admin/desmos-lessons", AdminDesmosLessonsPage],
  ["/admin/users", AdminUsersPage],
  ["/admin/teachers", AdminTeachersPage],
  ["/admin/stats", AdminStatsPage],
];

function StudentPage({ Page }) {
  return (
    <StudentRoute>
      <Page />
    </StudentRoute>
  );
}

function AdminPage({ Page }) {
  return (
    <AdminRoute>
      <Page />
    </AdminRoute>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/products" element={<ProductSelectPage />} />
      <Route path="/app" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/legal/:document?" element={<LegalPage />} />

      {studentRoutes.map(([path, Page]) => (
        <Route key={path} path={path} element={<StudentPage Page={Page} />} />
      ))}

      <Route
        path="/notifications"
        element={(
          <StudentRoute>
            <Navigate to="/settings#notifications" replace />
          </StudentRoute>
        )}
      />
      <Route
        path="/support"
        element={(
          <StudentRoute>
            <Navigate to="/dashboard" replace />
          </StudentRoute>
        )}
      />

      <Route
        path="/teacher"
        element={(
          <TeacherRoute>
            <TeacherPortalPage />
          </TeacherRoute>
        )}
      />
      <Route
        path="/teacher/exams"
        element={(
          <TeacherRoute>
            <AdminExamsPage mode="teacher" />
          </TeacherRoute>
        )}
      />
      <Route
        path="/teacher/*"
        element={(
          <TeacherRoute>
            <Navigate to="/teacher" replace />
          </TeacherRoute>
        )}
      />
      <Route
        path="/teacher/pending"
        element={(
          <TeacherAccountRoute>
            <TeacherPendingPage />
          </TeacherAccountRoute>
        )}
      />

      {adminRoutes.map(([path, Page]) => (
        <Route key={path} path={path} element={<AdminPage Page={Page} />} />
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
