import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import { createPassage, deletePassage, getPassages, updatePassage } from '../services/examService.js';
import { getApiErrorMessage } from '../utils/apiError.js';

export default function AdminPassagesPage() {
  const [loading, setLoading] = useState(true);
  const [passages, setPassages] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [editStatus, setEditStatus] = useState(null);
  const createForm = useForm({ defaultValues: { title: '', category: 'reading', content: '' } });
  const editForm = useForm({ defaultValues: { title: '', category: 'reading', content: '' } });

  async function load() {
    setPassages(await getPassages());
  }

  useEffect(() => {
    load()
      .catch(() => setPassages([]))
      .finally(() => setLoading(false));
  }, []);

  function openEditDialog(passage) {
    setEditStatus(null);
    editForm.reset({
      title: passage.title,
      category: passage.category,
      content: passage.content
    });
    setDialog({ mode: 'edit', passage });
  }

  async function handleEdit(values) {
    setEditStatus({ type: 'pending', message: 'Saving passage...' });

    try {
      await updatePassage(dialog.passage.id, {
        title: values.title.trim(),
        category: values.category.trim(),
        content: values.content.trim()
      });
      await load();
      setDialog(null);
      setEditStatus(null);
    } catch (error) {
      setEditStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Passage could not be updated.')
      });
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Passages" subtitle="Manage passage and stimulus content.">
        <Loader label="Loading passages..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Passages" subtitle="Manage passage and stimulus content.">
      <div className="content-grid passages-layout">
        <Card title="Create Passage">
          <form
            className="stack-form"
            onSubmit={createForm.handleSubmit(async (values) => {
              await createPassage(values);
              createForm.reset();
              await load();
            })}
          >
            <input placeholder="Title" {...createForm.register('title')} />
            <input placeholder="Category" {...createForm.register('category')} />
            <textarea placeholder="Content" {...createForm.register('content')} />
            <Button type="submit">Create passage</Button>
          </form>
        </Card>
        <Card title="Passage Library">
          {passages.length ? <div className="passage-library-grid">
            {passages.map((passage) => (
              <article key={passage.id} className="review-item passage-item">
                <div className="review-item-head">
                  <strong>{passage.title}</strong>
                  <span className="pill">{passage.category}</span>
                </div>
                <p>{passage.content.slice(0, 220)}{passage.content.length > 220 ? '...' : ''}</p>
                <div className="page-actions">
                  <Button
                    variant="ghost"
                    onClick={() => setDialog({ mode: 'view', passage })}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => openEditDialog(passage)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await deletePassage(passage.id);
                      await load();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div> : (
            <EmptyState
              icon={BookOpen}
              title="No passages yet"
              message="Create reading stimulus material to build your content library."
            />
          )}
        </Card>
      </div>

      <Modal
        open={dialog?.mode === 'view'}
        title={dialog?.passage?.title || 'Passage'}
        className="modal-card-wide"
        onClose={() => setDialog(null)}
        actions={<Button variant="ghost" onClick={() => setDialog(null)}>Close</Button>}
      >
        {dialog?.passage ? (
          <div className="passage-preview">
            <span className="pill">{dialog.passage.category}</span>
            <p>{dialog.passage.content}</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.mode === 'edit'}
        title="Edit Passage"
        className="modal-card-wide"
        onClose={() => setDialog(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="submit" form="passage-edit-form" disabled={editStatus?.type === 'pending'}>
              {editStatus?.type === 'pending' ? 'Saving...' : 'Save passage'}
            </Button>
          </>
        )}
      >
        <form id="passage-edit-form" className="stack-form" onSubmit={editForm.handleSubmit(handleEdit)}>
          <label className="form-field">
            <span>Title</span>
            <input {...editForm.register('title', { required: true, minLength: 2 })} />
          </label>
          <label className="form-field">
            <span>Category</span>
            <input {...editForm.register('category', { required: true, minLength: 2 })} />
          </label>
          <label className="form-field">
            <span>Content</span>
            <textarea className="passage-edit-content" {...editForm.register('content', { required: true, minLength: 20 })} />
          </label>
          {editStatus?.type === 'error' ? (
            <p className="support-status error">{editStatus.message}</p>
          ) : null}
        </form>
      </Modal>
    </AdminLayout>
  );
}
