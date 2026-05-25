import { useEffect, useState } from 'react';
import { FileQuestion } from 'lucide-react';
import { useForm } from 'react-hook-form';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import { createOption, deleteOption, deleteQuestion, getQuestions, updateQuestion } from '../services/examService.js';
import { getApiErrorMessage } from '../utils/apiError.js';

export default function AdminQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const editForm = useForm({
    defaultValues: { questionText: '', skill: '', difficulty: 'MEDIUM', explanation: '', order: 1 }
  });
  const optionForm = useForm({
    defaultValues: { label: 'A', text: '', order: 1 }
  });

  async function load() {
    setQuestions(await getQuestions());
  }

  useEffect(() => {
    load()
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, []);

  function closeDialog() {
    setDialog(null);
    setActionStatus(null);
  }

  function openEditDialog(question) {
    setActionStatus(null);
    editForm.reset({
      questionText: question.questionText,
      skill: question.skill,
      difficulty: question.difficulty,
      explanation: question.explanation,
      order: question.order
    });
    setDialog({ mode: 'edit', question });
  }

  function openOptionDialog(question) {
    setActionStatus(null);
    optionForm.reset({
      label: '',
      text: '',
      order: question.options.length + 1
    });
    setDialog({ mode: 'option', question });
  }

  async function handleEdit(values) {
    setActionStatus({ type: 'pending', message: 'Saving question...' });

    try {
      await updateQuestion(dialog.question.id, {
        questionText: values.questionText.trim(),
        skill: values.skill.trim(),
        difficulty: values.difficulty,
        explanation: values.explanation.trim(),
        order: Number(values.order)
      });
      await load();
      closeDialog();
    } catch (error) {
      setActionStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Question could not be updated.')
      });
    }
  }

  async function handleAddOption(values) {
    setActionStatus({ type: 'pending', message: 'Saving option...' });

    try {
      await createOption({
        questionId: dialog.question.id,
        label: values.label.trim().toUpperCase(),
        text: values.text.trim(),
        isCorrect: false,
        order: Number(values.order)
      });
      await load();
      closeDialog();
    } catch (error) {
      setActionStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Option could not be added.')
      });
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Questions" subtitle="Audit question bank items, answer keys, skills, and options.">
        <Loader label="Loading questions..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Questions" subtitle="Audit question bank items, answer keys, skills, and options.">
      <Card title="Question Bank">
        {questions.length ? <div className="table-wrap">
          <table className="data-table admin-data-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Type</th>
                <th>Skill</th>
                <th>Difficulty</th>
                <th>Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td data-label="Question">{question.questionText}</td>
                  <td data-label="Type">{question.type}</td>
                  <td data-label="Skill">{question.skill}</td>
                  <td data-label="Difficulty">{question.difficulty}</td>
                  <td data-label="Options">
                    <div className="option-chip-list">
                      {question.options.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className="option-chip"
                          onClick={async () => {
                            await deleteOption(option.id);
                            await load();
                          }}
                        >
                          {option.label}: {option.text}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td data-label="Actions" className="table-actions">
                    <Button variant="ghost" onClick={() => setDialog({ mode: 'view', question })}>
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openOptionDialog(question)}
                    >
                      Add option
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openEditDialog(question)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await deleteQuestion(question.id);
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
            icon={FileQuestion}
            title="Question bank is empty"
            message="Questions added through an exam builder will be visible here."
          />
        )}
      </Card>

      <Modal
        open={dialog?.mode === 'view'}
        title="Question Details"
        className="modal-card-wide"
        onClose={closeDialog}
        actions={<Button variant="ghost" onClick={closeDialog}>Close</Button>}
      >
        {dialog?.question ? (
          <div className="question-preview">
            <div className="preview-pills">
              <span className="pill">{dialog.question.type}</span>
              <span className="pill">{dialog.question.difficulty}</span>
              <span className="pill">{dialog.question.skill}</span>
            </div>
            <p className="preview-question">{dialog.question.questionText}</p>
            {dialog.question.passage ? <p><strong>Passage:</strong> {dialog.question.passage.title}</p> : null}
            <div className="preview-options">
              {dialog.question.options.map((option) => (
                <p key={option.id}>
                  <strong>{option.label}.</strong> {option.text}
                </p>
              ))}
            </div>
            <p><strong>Explanation:</strong> {dialog.question.explanation}</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.mode === 'edit'}
        title="Edit Question"
        className="modal-card-wide"
        onClose={closeDialog}
        actions={(
          <>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" form="question-edit-form" disabled={actionStatus?.type === 'pending'}>
              {actionStatus?.type === 'pending' ? 'Saving...' : 'Save question'}
            </Button>
          </>
        )}
      >
        <form id="question-edit-form" className="stack-form" onSubmit={editForm.handleSubmit(handleEdit)}>
          <label className="form-field">
            <span>Question text</span>
            <textarea {...editForm.register('questionText', { required: true, minLength: 3 })} />
          </label>
          <label className="form-field">
            <span>Skill</span>
            <input {...editForm.register('skill', { required: true, minLength: 2 })} />
          </label>
          <label className="form-field">
            <span>Difficulty</span>
            <select {...editForm.register('difficulty')}>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </label>
          <label className="form-field">
            <span>Position in section</span>
            <input type="number" min="0" {...editForm.register('order', { required: true, min: 0 })} />
          </label>
          <label className="form-field">
            <span>Explanation</span>
            <textarea {...editForm.register('explanation', { required: true, minLength: 5 })} />
          </label>
          {actionStatus?.type === 'error' ? (
            <p className="support-status error">{actionStatus.message}</p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={dialog?.mode === 'option'}
        title="Add Option"
        onClose={closeDialog}
        actions={(
          <>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" form="option-create-form" disabled={actionStatus?.type === 'pending'}>
              {actionStatus?.type === 'pending' ? 'Saving...' : 'Add option'}
            </Button>
          </>
        )}
      >
        <form id="option-create-form" className="stack-form" onSubmit={optionForm.handleSubmit(handleAddOption)}>
          <p className="helper-copy">This adds an option without changing the saved answer key.</p>
          <label className="form-field">
            <span>Label</span>
            <input placeholder="A" maxLength="5" {...optionForm.register('label', { required: true })} />
          </label>
          <label className="form-field">
            <span>Option text</span>
            <input {...optionForm.register('text', { required: true })} />
          </label>
          <label className="form-field">
            <span>Display order</span>
            <input type="number" min="0" {...optionForm.register('order', { required: true, min: 0 })} />
          </label>
          {actionStatus?.type === 'error' ? (
            <p className="support-status error">{actionStatus.message}</p>
          ) : null}
        </form>
      </Modal>
    </AdminLayout>
  );
}
