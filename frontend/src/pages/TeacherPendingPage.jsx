import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import DashboardArt from '../components/dashboard/DashboardArt.jsx';
import { useAuthStore } from '../store/authStore.js';
import { dashboardAssets } from '../data/dashboardAssets.js';

export default function TeacherPendingPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const approvalStatus = user?.teacherApprovalStatus || 'PENDING';
  const isRejected = approvalStatus === 'REJECTED';
  const isSuspended = approvalStatus === 'SUSPENDED';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <main className="teacher-auth-shell">
      <Card className="teacher-pending-card">
        <DashboardArt src={dashboardAssets.hat} className="teacher-pending-art" />
        <span className="course-access-kicker">
          {isRejected ? 'Teacher access rejected' : isSuspended ? 'Teacher access suspended' : 'Teacher approval required'}
        </span>
        <h1>Welcome, {user?.fullName || 'Teacher'}</h1>
        <p>
          {isRejected
            ? 'Admin rejected this teacher access request. Contact MonoPrep support before trying again.'
            : isSuspended
              ? 'This teacher account is suspended. Dashboard and class data remain protected.'
              : 'Your teacher account was created by admin, but dashboard access starts only after admin approval. This protects classes, students, materials, feedback, and live session data.'}
        </p>
        <div className="teacher-pending-meta">
          <span>Status</span>
          <strong>{approvalStatus}</strong>
        </div>
        <Button onClick={handleLogout}>Sign out</Button>
      </Card>
    </main>
  );
}
