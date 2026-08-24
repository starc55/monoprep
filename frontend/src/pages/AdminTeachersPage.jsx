import { useEffect, useState } from "react";
import { CheckCircle2, Eye, PauseCircle, Plus, Upload, UserRound, XCircle } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Loader from "../components/ui/Loader.jsx";
import Modal from "../components/ui/Modal.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import RowActionMenu from "../components/ui/RowActionMenu.jsx";
import { uploadTeacherImage } from "../services/examService.js";
import { createAdminTeacher, getAdminTeachers, updateAdminTeacherStatus } from "../services/adminTeacherService.js";

const initialForm = {
  fullName: "", email: "", username: "", temporaryPassword: "", subject: "",
  experience: "", bio: "", contactEmail: "", contactPhone: "", telegram: "",
  avatarUrl: "", status: "PENDING",
};

const teacherStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "MP";
}

export default function AdminTeachersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState("");

  async function loadTeachers() {
    setTeachers(await getAdminTeachers());
  }

  useEffect(() => {
    loadTeachers().catch(() => setTeachers([])).finally(() => setLoading(false));
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setForm(initialForm);
    setError("");
    setDialog({ mode: "create" });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      updateField("avatarUrl", await uploadTeacherImage(file));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Teacher image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createAdminTeacher({
        ...form,
        username: form.username.trim() || undefined,
        experience: form.experience.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatarUrl: form.avatarUrl || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        telegram: form.telegram.trim() || undefined,
        contactEnabled: Boolean(form.contactEmail.trim() || form.contactPhone.trim() || form.telegram.trim()),
      });
      await loadTeachers();
      setDialog(null);
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to create teacher.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id, status) {
    setSaving(true);
    try {
      await updateAdminTeacherStatus(id, status);
      await loadTeachers();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminLayout title="Teachers" subtitle="Create and approve teacher accounts."><Loader label="Loading teachers..." /></AdminLayout>;
  }

  return (
    <AdminLayout
      title="Teachers"
      subtitle="Admin-managed teacher identities and access approval."
      actions={<Button onClick={openCreate}><Plus aria-hidden="true" /> Add teacher</Button>}
    >
      <Card title="Teacher directory" className="crm-table-card">
        {teachers.length ? (
          <div className="table-wrap">
            <table className="data-table crm-data-table">
              <thead><tr><th>Teacher</th><th>Subject</th><th>Experience</th><th>Contact</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td data-label="Teacher"><div className="table-person-cell"><span className="table-avatar">{teacher.avatarUrl ? <img src={teacher.avatarUrl} alt="" /> : initials(teacher.fullName)}</span><span><strong>{teacher.fullName}</strong><small>{teacher.email}</small></span></div></td>
                    <td data-label="Subject">{teacher.subject}</td>
                    <td data-label="Experience">{teacher.experience || "Not provided"}</td>
                    <td data-label="Contact">{teacher.contactEmail || teacher.contactPhone || teacher.telegram || "Private"}</td>
                    <td data-label="Status"><span className={`table-status ${teacher.status.toLowerCase()}`}>{teacher.status}</span></td>
                    <td className="table-actions">
                      <RowActionMenu
                        label={`Actions for ${teacher.fullName}`}
                        items={[
                          { label: "View", icon: Eye, onSelect: () => setDialog({ mode: "view", teacher }) },
                          { label: "Approve", icon: CheckCircle2, disabled: teacher.status === "APPROVED", onSelect: () => handleStatus(teacher.id, "APPROVED") },
                          { label: "Suspend", icon: PauseCircle, disabled: teacher.status === "SUSPENDED", onSelect: () => handleStatus(teacher.id, "SUSPENDED") },
                          { label: "Reject", icon: XCircle, tone: "danger", disabled: teacher.status === "REJECTED", onSelect: () => handleStatus(teacher.id, "REJECTED") },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={UserRound} title="No teachers yet" message="Create the first teacher account. Teachers cannot self-register." actionLabel="Add teacher" actionOnClick={openCreate} />
        )}
      </Card>

      <Modal open={dialog?.mode === "create"} title="Add teacher" className="modal-card-wide crm-form-modal" onClose={() => setDialog(null)} actions={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" form="teacher-create-form" disabled={saving || uploading}>{saving ? "Creating..." : "Create teacher"}</Button></>}>
        <form id="teacher-create-form" className="teacher-create-grid" onSubmit={handleSubmit}>
          <div className="teacher-avatar-upload">
            <span className="teacher-avatar-preview">{form.avatarUrl ? <img src={form.avatarUrl} alt="Teacher preview" /> : <UserRound aria-hidden="true" />}</span>
            <label className="button button-ghost"><Upload aria-hidden="true" /> {uploading ? "Uploading..." : "Upload photo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={handleImageUpload} /></label>
          </div>
          <div className="crm-form-row">
            <label className="form-field"><span>Full name</span><input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required /></label>
            <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
          </div>
          <div className="crm-form-row">
            <label className="form-field"><span>Username</span><input value={form.username} onChange={(event) => updateField("username", event.target.value)} /></label>
            <label className="form-field"><span>Temporary password</span><input type="text" minLength="12" value={form.temporaryPassword} onChange={(event) => updateField("temporaryPassword", event.target.value)} required /></label>
          </div>
          <div className="crm-form-row">
            <label className="form-field"><span>Subject</span><input value={form.subject} onChange={(event) => updateField("subject", event.target.value)} required /></label>
            <label className="form-field"><span>Experience</span><input value={form.experience} onChange={(event) => updateField("experience", event.target.value)} /></label>
          </div>
          <label className="form-field"><span>Teacher bio</span><textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} /></label>
          <div className="crm-form-row crm-form-row-three">
            <label className="form-field"><span>Contact email</span><input type="email" value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} /></label>
            <label className="form-field"><span>Phone</span><input value={form.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} /></label>
            <label className="form-field"><span>Telegram</span><input value={form.telegram} onChange={(event) => updateField("telegram", event.target.value)} /></label>
          </div>
          <div className="form-field"><span>Status</span><PremiumSelect ariaLabel="Teacher status" value={form.status} onChange={(value) => updateField("status", value)} options={teacherStatusOptions} /></div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </Modal>

      <Modal open={dialog?.mode === "view"} title="Teacher details" onClose={() => setDialog(null)} actions={<Button variant="ghost" onClick={() => setDialog(null)}>Close</Button>}>
        {dialog?.teacher ? <div className="teacher-detail-view"><div className="table-person-cell"><span className="table-avatar large">{dialog.teacher.avatarUrl ? <img src={dialog.teacher.avatarUrl} alt="" /> : initials(dialog.teacher.fullName)}</span><span><strong>{dialog.teacher.fullName}</strong><small>{dialog.teacher.email}</small></span></div><dl><div><dt>Subject</dt><dd>{dialog.teacher.subject}</dd></div><div><dt>Status</dt><dd>{dialog.teacher.status}</dd></div><div><dt>Experience</dt><dd>{dialog.teacher.experience || "Not provided"}</dd></div><div><dt>Bio</dt><dd>{dialog.teacher.bio || "Not provided"}</dd></div></dl></div> : null}
      </Modal>
    </AdminLayout>
  );
}
