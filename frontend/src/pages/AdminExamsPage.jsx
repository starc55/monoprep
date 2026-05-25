import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useForm } from 'react-hook-form';
import AdminLayout from '../layouts/AdminLayout.jsx';
import AdminExamBuilder from '../components/admin/AdminExamBuilder.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import { getApiErrorMessage } from '../utils/apiError.js';
import {
  createExam,
  createPassage,
  createQuestion,
  createSection,
  deleteExam,
  deleteSection,
  getExams,
  getPassages,
  updateSection,
  updateExam,
  uploadQuestionImage
} from '../services/examService.js';

export default function AdminExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [passages, setPassages] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionStatus, setSectionStatus] = useState(null);
  const sectionForm = useForm({
    defaultValues: { title: '', type: 'reading_writing', duration: 30, order: 1 }
  });

  async function load() {
    const [examRows, passageRows] = await Promise.all([getExams(), getPassages()]);
    setExams(examRows);
    setPassages(passageRows);
  }

  useEffect(() => {
    load()
      .catch(() => {
        setExams([]);
        setPassages([]);
      })
      .finally(() => setLoading(false));
  }, []);

  function openSectionEditor(section) {
    setEditingSection(section);
    setSectionStatus(null);
    sectionForm.reset({
      title: section.title,
      type: section.type,
      duration: section.duration,
      order: section.order
    });
  }

  async function handleSectionUpdate(values) {
    setSectionStatus({ type: 'pending', message: 'Saving section...' });

    try {
      await updateSection(editingSection.id, {
        title: values.title.trim(),
        type: values.type,
        duration: Number(values.duration),
        order: Number(values.order)
      });
      await load();
      setEditingSection(null);
      setSectionStatus(null);
    } catch (error) {
      setSectionStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Section could not be updated.')
      });
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Exams" subtitle="Create, publish, unpublish, and organize exam content.">
        <Loader label="Loading exams..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Exams" subtitle="Create, publish, unpublish, and organize exam content.">
      <AdminExamBuilder
        exams={exams}
        passages={passages}
        onCreateExam={async (payload) => {
          const exam = await createExam(payload);
          await load();
          return exam;
        }}
        onCreateSection={async (payload) => {
          const section = await createSection(payload);
          await load();
          return section;
        }}
        onCreatePassage={async (payload) => {
          const passage = await createPassage(payload);
          await load();
          return passage;
        }}
        onCreateQuestion={async (payload) => {
          const question = await createQuestion(payload);
          await load();
          return question;
        }}
        onUploadImage={uploadQuestionImage}
      />

      <div className="admin-content-grid">
        <Card title="Exam Catalog">
          {exams.length ? <div className="table-wrap">
            <table className="data-table admin-data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Sections</th>
                  <th>Published</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td data-label="Title">{exam.title}</td>
                    <td data-label="Type">{exam.type}</td>
                    <td data-label="Sections">{exam.sections.length}</td>
                    <td data-label="Published">{exam.isPublished ? 'Yes' : 'No'}</td>
                    <td data-label="Actions" className="table-actions">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await updateExam(exam.id, { isPublished: !exam.isPublished });
                          await load();
                        }}
                      >
                        {exam.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await deleteExam(exam.id);
                          await load();
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : (
            <EmptyState
              icon={ClipboardList}
              title="No exams created"
              message="Create an exam above to start assembling sections and questions."
            />
          )}
        </Card>

        <Card title="Sections">
          {exams.some((exam) => exam.sections.length) ? <div className="review-list">
            {exams.flatMap((exam) =>
              exam.sections.map((section) => (
                <article key={section.id} className="review-item">
                  <div className="review-item-head">
                    <strong>{section.title}</strong>
                    <span className="pill">{exam.title}</span>
                  </div>
                  <p>{section.type} - {section.duration} min - {section.questionsCount} questions</p>
                  <div className="page-actions">
                    <Button variant="ghost" onClick={() => openSectionEditor(section)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await deleteSection(section.id);
                        await load();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div> : (
            <EmptyState
              icon={ClipboardList}
              title="No sections yet"
              message="Exam modules will appear here once they are created."
            />
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(editingSection)}
        title="Edit Section"
        onClose={() => setEditingSection(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button
              type="submit"
              form="admin-section-edit-form"
              disabled={sectionStatus?.type === 'pending'}
            >
              {sectionStatus?.type === 'pending' ? 'Saving...' : 'Save section'}
            </Button>
          </>
        )}
      >
        <form
          id="admin-section-edit-form"
          className="stack-form"
          onSubmit={sectionForm.handleSubmit(handleSectionUpdate)}
        >
          <label className="form-field">
            <span>Title</span>
            <input {...sectionForm.register('title', { required: true, minLength: 2 })} />
          </label>
          <label className="form-field">
            <span>Type</span>
            <select {...sectionForm.register('type')}>
              <option value="reading_writing">reading_writing</option>
              <option value="math">math</option>
              <option value="listening">listening</option>
              <option value="custom_practice">custom_practice</option>
            </select>
          </label>
          <label className="form-field">
            <span>Duration (minutes)</span>
            <input type="number" min="1" {...sectionForm.register('duration', { required: true, min: 1 })} />
          </label>
          <label className="form-field">
            <span>Order</span>
            <input type="number" min="0" {...sectionForm.register('order', { required: true, min: 0 })} />
          </label>
          {sectionStatus?.type === 'error' ? (
            <p className="support-status error">{sectionStatus.message}</p>
          ) : null}
        </form>
      </Modal>
    </AdminLayout>
  );
}
