import { Link } from 'react-router-dom';
import { CheckCircle2, FilePlus2, ShieldCheck } from 'lucide-react';
import TeacherLayout from '../layouts/TeacherLayout.jsx';
import Card from '../components/ui/Card.jsx';
import DashboardArt from '../components/dashboard/DashboardArt.jsx';
import { dashboardAssets } from '../data/dashboardAssets.js';
import { useAuthStore } from '../store/authStore.js';

export default function TeacherPortalPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <TeacherLayout title="Teacher Dashboard" subtitle="Create and manage MonoPrep SAT exams from one focused workspace.">
      <div className="teacher-workspace-shell">
        <section className="teacher-portal-hero">
          <DashboardArt src={dashboardAssets.hat} className="teacher-portal-art" />
          <div>
            <span>Approved teacher</span>
            <h1>{user?.fullName || 'MonoPrep Teacher'}</h1>
            <p>{user?.teacherSubject || user?.email || 'SAT assessment creator'}</p>
          </div>
          <Link className="button button-primary" to="/teacher/exams">
            <FilePlus2 aria-hidden="true" /> Open Exam Builder
          </Link>
        </section>

        <section className="teacher-dashboard-grid teacher-mvp-grid">
          <Card title="Exam access" className="teacher-mvp-card">
            <ShieldCheck aria-hidden="true" />
            <p>Create Free and Premium exams with the same staged builder available to administrators.</p>
          </Card>
          <Card title="Available workflow" className="teacher-mvp-card">
            <CheckCircle2 aria-hidden="true" />
            <p>Choose Real Exam or Question Hub, configure modules, add questions, then publish when ready.</p>
          </Card>
        </section>
      </div>
    </TeacherLayout>
  );
}
