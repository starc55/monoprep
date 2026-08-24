import { useEffect, useState } from 'react';
import { Edit3, FunctionSquare, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmActionModal from '../components/ui/ConfirmActionModal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import Modal from '../components/ui/Modal.jsx';
import {
  createDesmosLesson,
  deleteDesmosLesson,
  getDesmosLessons,
  updateDesmosLesson
} from '../services/desmosService.js';
import { uploadQuestionImage } from '../services/examService.js';
import { resolveAssetUrl } from '../utils/assets.js';
import '../styles/pages/desmos-hack.css';

const emptyForm = {
  title: '',
  summary: '',
  theory: '',
  imageUrls: [],
  sortOrder: 0,
  isPublished: false
};

function lessonImages(lesson) {
  if (Array.isArray(lesson?.imageUrls) && lesson.imageUrls.length) return lesson.imageUrls;
  return lesson?.imageUrl ? [lesson.imageUrl] : [];
}

export default function AdminDesmosLessonsPage() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const rows = await getDesmosLessons();
    setLessons(rows);
  }

  useEffect(() => {
    load().catch(() => setLessons([])).finally(() => setLoading(false));
  }, []);

  function openEditor(lesson = null) {
    setEditing(lesson || { id: '' });
    setForm(lesson ? {
      title: lesson.title,
      summary: lesson.summary,
      theory: lesson.theory,
      imageUrls: lessonImages(lesson),
      sortOrder: lesson.sortOrder || 0,
      isPublished: lesson.isPublished
    } : emptyForm);
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder),
        imageUrl: form.imageUrls[0] || null,
        imageUrls: form.imageUrls,
      };
      if (editing.id) await updateDesmosLesson(editing.id, payload);
      else await createDesmosLesson(payload);
      await load();
      setEditing(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Lesson could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(fileList) {
    const availableSlots = 8 - form.imageUrls.length;
    const files = Array.from(fileList || []).slice(0, availableSlots);
    if (!files.length) {
      if (availableSlots <= 0) setError('A lesson can contain up to 8 images.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploadedUrls = await Promise.all(files.map(uploadQuestionImage));
      setForm((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploadedUrls].slice(0, 8),
      }));
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'One or more images could not be uploaded.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <AdminLayout title="Desmos Lessons" subtitle="Prepare visual calculator lessons for students."><Loader label="Loading lessons..." /></AdminLayout>;
  }

  return (
    <AdminLayout
      title="Desmos Lessons"
      subtitle="Upload visual explanations and publish them to the student Desmos Hack lab."
      actions={<Button onClick={() => openEditor()}><Plus aria-hidden="true" /> Create lesson</Button>}
    >
      {lessons.length ? (
        <div className="table-wrap">
          <table className="data-table admin-data-table desmos-admin-table">
            <thead><tr><th>Lesson</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td data-label="Lesson"><div className="desmos-admin-lesson-cell">{lessonImages(lesson)[0] ? <img src={resolveAssetUrl(lessonImages(lesson)[0])} alt="" /> : <FunctionSquare />}<span><b>{lesson.title}</b><small>{lesson.summary}{lessonImages(lesson).length > 1 ? ` · ${lessonImages(lesson).length} images` : ''}</small></span></div></td>
                  <td data-label="Order">{lesson.sortOrder}</td>
                  <td data-label="Status"><span className={`pill ${lesson.isPublished ? 'success' : ''}`}>{lesson.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td data-label="Actions" className="table-actions">
                    <Button variant="ghost" onClick={() => openEditor(lesson)}><Edit3 aria-hidden="true" /> Edit</Button>
                    <Button variant="ghost" onClick={() => setDeleteTarget(lesson)}><Trash2 aria-hidden="true" /> Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={FunctionSquare} title="No Desmos lessons yet" message="Create the first visual lesson for the student math lab." />
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit Desmos lesson' : 'Create Desmos lesson'}
        onClose={() => setEditing(null)}
        actions={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="desmos-lesson-form" disabled={saving || uploading}>{saving ? 'Saving...' : 'Save lesson'}</Button></>}
      >
        <form id="desmos-lesson-form" className="stack-form" onSubmit={save}>
          <label className="form-field"><span>Title</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} minLength="3" required /></label>
          <label className="form-field"><span>Short summary</span><textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} minLength="10" required /></label>
          <label className="form-field"><span>Full theory</span><textarea className="desmos-theory-input" value={form.theory} onChange={(event) => setForm((current) => ({ ...current, theory: event.target.value }))} minLength="20" required /></label>
          <div className="form-field">
            <span>Lesson images <small>{form.imageUrls.length}/8</small></span>
            <label className="desmos-file-picker">
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading || form.imageUrls.length >= 8}
                onChange={(event) => {
                  uploadImages(event.target.files);
                  event.target.value = '';
                }}
              />
              <ImagePlus aria-hidden="true" />
              <span><b>{uploading ? 'Uploading images...' : 'Choose lesson images'}</b><small>Select several PNG, JPG or WEBP files, up to 5 MB each</small></span>
            </label>
            {form.imageUrls.length ? (
              <div className="desmos-upload-gallery">
                {form.imageUrls.map((imageUrl, index) => (
                  <figure key={`${imageUrl}-${index}`}>
                    <img src={resolveAssetUrl(imageUrl)} alt={`Lesson visual ${index + 1}`} />
                    <span>{index === 0 ? 'Cover' : index + 1}</span>
                    <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((_, itemIndex) => itemIndex !== index) }))}><X aria-hidden="true" /></button>
                  </figure>
                ))}
              </div>
            ) : null}
          </div>
          <label className="form-field"><span>Display order</span><input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} /></label>
          <label className="settings-toggle"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} /><span>Publish for students</span></label>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </Modal>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete Desmos lesson?"
        message={deleteTarget ? `Delete "${deleteTarget.title}" permanently?` : ''}
        confirmLabel="Delete lesson"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await deleteDesmosLesson(deleteTarget.id); await load(); setDeleteTarget(null); }}
      />
    </AdminLayout>
  );
}
