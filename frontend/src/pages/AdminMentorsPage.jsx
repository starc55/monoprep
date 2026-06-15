import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, ImagePlus, MessageCircle, Phone, Plus, Star, Trash2, Upload, UserRound } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ConfirmActionModal from '../components/ui/ConfirmActionModal.jsx';
import Loader from '../components/ui/Loader.jsx';
import { createMentor, deleteMentor, getMentors, updateMentor } from '../services/mentorService.js';
import { uploadQuestionImage } from '../services/examService.js';
import { resolveAssetUrl } from '../utils/assets.js';

const emptyForm = {
  name: '',
  subject: '',
  bio: '',
  imageUrl: '',
  telegram: '',
  phone: '',
  slotsText: '12:30, 15:00, 18:30',
  rating: 5,
  isActive: true
};

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase() || 'MP';
}

export default function AdminMentorsPage() {
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadMentors() {
    const rows = await getMentors({ includeInactive: true });
    setMentors(rows);
  }

  useEffect(() => {
    loadMentors().finally(() => setLoading(false));
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editMentor(mentor) {
    setEditingId(mentor.id);
    setForm({
      name: mentor.name,
      subject: mentor.subject,
      bio: mentor.bio || '',
      imageUrl: mentor.imageUrl || '',
      telegram: mentor.telegram || '',
      phone: mentor.phone || '',
      slotsText: (mentor.slots || []).join(', '),
      rating: mentor.rating || 5,
      isActive: mentor.isActive
    });
  }

  async function handleImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadQuestionImage(file);
      updateField('imageUrl', url);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      bio: form.bio.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      telegram: form.telegram.trim() || null,
      phone: form.phone.trim() || null,
      slots: form.slotsText.split(',').map((slot) => slot.trim()).filter(Boolean),
      rating: Number(form.rating) || 5,
      isActive: form.isActive
    };

    try {
      if (editingId) await updateMentor(editingId, payload);
      else await createMentor(payload);
      await loadMentors();
      setForm(emptyForm);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteMentor(deleteTarget.id);
    setDeleteTarget(null);
    await loadMentors();
  }

  if (loading) {
    return (
      <AdminLayout title="Mentors" subtitle="Manage support-session teachers shown to students.">
        <Loader label="Loading mentors..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Mentors" subtitle="Manage support-session teachers shown to students.">
      <div className="admin-editor-grid mentor-editor-grid-pro">
        <Card title={editingId ? 'Edit mentor' : 'Add mentor'} className="admin-editor-card mentor-form-card-pro">
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="mentor-image-uploader">
              <div className="mentor-image-preview">
                {form.imageUrl ? <img src={resolveAssetUrl(form.imageUrl)} alt="" /> : <ImagePlus aria-hidden="true" />}
              </div>
              <div>
                <strong>Mentor profile image</strong>
                <p>Upload a clear square photo. It will appear on student mentor cards.</p>
                <label className="button button-secondary mentor-upload-button">
                  <Upload aria-hidden="true" />
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleImageFile} disabled={uploadingImage} />
                </label>
              </div>
            </div>
            <label className="form-field">
              <span>Name</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Subject / role</span>
              <input value={form.subject} onChange={(event) => updateField('subject', event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Bio</span>
              <textarea value={form.bio} onChange={(event) => updateField('bio', event.target.value)} rows={3} />
            </label>
            <label className="form-field">
              <span>Image URL</span>
              <input value={form.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} placeholder="Uploaded image URL appears here" />
            </label>
            <div className="form-grid two">
              <label className="form-field">
                <span>Telegram</span>
                <input value={form.telegram} onChange={(event) => updateField('telegram', event.target.value)} placeholder="@mentor" />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+998..." />
              </label>
            </div>
            <div className="form-grid two">
              <label className="form-field">
                <span>Available slots</span>
                <input value={form.slotsText} onChange={(event) => updateField('slotsText', event.target.value)} />
              </label>
              <label className="form-field">
                <span>Rating</span>
                <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => updateField('rating', event.target.value)} />
              </label>
            </div>
            <label className="form-field checkbox-field">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} />
              <span>Visible to students</span>
            </label>
            <div className="form-actions-row">
              {editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button> : null}
              <Button type="submit" disabled={saving}>
                <Plus aria-hidden="true" />
                {saving ? 'Saving...' : 'Save mentor'}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Mentor cards" className="admin-list-card mentor-list-card-pro">
          <div className="admin-manage-list mentor-admin-list">
            {mentors.map((mentor, index) => (
              <motion.article
                key={mentor.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.035, duration: 0.28 }}
                whileHover={{ y: -3 }}
              >
                <span className="mentor-mini-avatar">
                  {mentor.imageUrl ? <img src={resolveAssetUrl(mentor.imageUrl)} alt="" /> : getInitials(mentor.name)}
                </span>
                <div>
                  <strong>{mentor.name}</strong>
                  <small><Star aria-hidden="true" /> {mentor.rating || 5} - {mentor.subject}</small>
                  <p>{mentor.bio || 'No bio yet.'}</p>
                  <div className="mentor-contact-row">
                    {mentor.telegram ? <span><MessageCircle aria-hidden="true" /> {mentor.telegram}</span> : null}
                    {mentor.phone ? <span><Phone aria-hidden="true" /> {mentor.phone}</span> : null}
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => editMentor(mentor)}><Edit3 aria-hidden="true" /></button>
                  <button type="button" onClick={() => setDeleteTarget(mentor)}><Trash2 aria-hidden="true" /></button>
                </div>
              </motion.article>
            ))}
            {!mentors.length ? (
              <div className="admin-empty-inline">
                <UserRound aria-hidden="true" />
                <span>No mentors yet. Add the first support-session teacher.</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete mentor?"
        message={deleteTarget ? `Delete ${deleteTarget.name} from support sessions?` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}
