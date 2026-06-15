import { useEffect, useState } from 'react';
import { Edit3, FileQuestion, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ConfirmActionModal from '../components/ui/ConfirmActionModal.jsx';
import Loader from '../components/ui/Loader.jsx';
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  getQuestionBankItems,
  updateQuestionBankItem
} from '../services/questionBankService.js';

const emptyForm = {
  subject: 'Math',
  domain: '',
  skill: '',
  difficulty: 'MEDIUM',
  prompt: '',
  choicesText: 'A|First choice\nB|Second choice\nC|Third choice\nD|Fourth choice',
  correctAnswer: 'A',
  explanation: '',
  isBluebook: true,
  isActive: true
};

function parseChoices(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawLabel, ...rest] = line.split('|');
      return {
        label: (rawLabel || String.fromCharCode(65 + index)).trim(),
        text: rest.join('|').trim() || rawLabel.trim()
      };
    });
}

function choicesToText(choices = []) {
  return choices.map((choice) => `${choice.label}|${choice.text}`).join('\n');
}

export default function AdminQuestionBankPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadItems() {
    const rows = await getQuestionBankItems({ includeInactive: true });
    setItems(rows);
  }

  useEffect(() => {
    loadItems().finally(() => setLoading(false));
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm({
      subject: item.subject,
      domain: item.domain,
      skill: item.skill,
      difficulty: item.difficulty,
      prompt: item.prompt,
      choicesText: choicesToText(item.choices || []),
      correctAnswer: String(item.correctAnswer || ''),
      explanation: item.explanation || '',
      isBluebook: item.isBluebook,
      isActive: item.isActive
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      subject: form.subject,
      domain: form.domain.trim(),
      skill: form.skill.trim(),
      difficulty: form.difficulty,
      prompt: form.prompt.trim(),
      choices: parseChoices(form.choicesText),
      correctAnswer: form.correctAnswer.trim(),
      explanation: form.explanation.trim() || null,
      isBluebook: form.isBluebook,
      isActive: form.isActive
    };

    try {
      if (editingId) await updateQuestionBankItem(editingId, payload);
      else await createQuestionBankItem(payload);
      await loadItems();
      setForm(emptyForm);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteQuestionBankItem(deleteTarget.id);
    setDeleteTarget(null);
    await loadItems();
  }

  if (loading) {
    return (
      <AdminLayout title="Question Hub" subtitle="Create question-bank items students can solve anytime.">
        <Loader label="Loading question bank..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Question Hub" subtitle="Create question-bank items students can solve anytime.">
      <div className="admin-editor-grid">
        <Card title={editingId ? 'Edit question item' : 'Add question item'} className="admin-editor-card">
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid two">
              <label className="form-field">
                <span>Subject</span>
                <select value={form.subject} onChange={(event) => updateField('subject', event.target.value)}>
                  <option>Math</option>
                  <option>Reading & Writing</option>
                </select>
              </label>
              <label className="form-field">
                <span>Difficulty</span>
                <select value={form.difficulty} onChange={(event) => updateField('difficulty', event.target.value)}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>Domain</span>
              <input value={form.domain} onChange={(event) => updateField('domain', event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Skill</span>
              <input value={form.skill} onChange={(event) => updateField('skill', event.target.value)} required />
            </label>
            <label className="form-field">
              <span>Prompt</span>
              <textarea value={form.prompt} onChange={(event) => updateField('prompt', event.target.value)} rows={4} required />
            </label>
            <label className="form-field">
              <span>Choices (label|text, one per line)</span>
              <textarea value={form.choicesText} onChange={(event) => updateField('choicesText', event.target.value)} rows={5} />
            </label>
            <div className="form-grid two">
              <label className="form-field">
                <span>Correct answer</span>
                <input value={form.correctAnswer} onChange={(event) => updateField('correctAnswer', event.target.value)} required />
              </label>
              <label className="form-field checkbox-field">
                <input type="checkbox" checked={form.isBluebook} onChange={(event) => updateField('isBluebook', event.target.checked)} />
                <span>Bluebook style</span>
              </label>
            </div>
            <label className="form-field">
              <span>Explanation</span>
              <textarea value={form.explanation} onChange={(event) => updateField('explanation', event.target.value)} rows={3} />
            </label>
            <label className="form-field checkbox-field">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} />
              <span>Visible to students</span>
            </label>
            <div className="form-actions-row">
              {editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</Button> : null}
              <Button type="submit" disabled={saving}>
                <Plus aria-hidden="true" />
                {saving ? 'Saving...' : 'Save item'}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Question bank items" className="admin-list-card">
          <div className="admin-manage-list">
            {items.map((item) => (
              <article key={item.id}>
                <span className="settings-card-icon blue"><FileQuestion aria-hidden="true" /></span>
                <div>
                  <strong>{item.skill}</strong>
                  <small>{item.subject} - {item.domain} - {item.difficulty}</small>
                  <p>{item.prompt}</p>
                </div>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => editItem(item)}><Edit3 aria-hidden="true" /></button>
                  <button type="button" onClick={() => setDeleteTarget(item)}><Trash2 aria-hidden="true" /></button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete question item?"
        message={deleteTarget ? `Delete "${deleteTarget.skill}" from Question Hub?` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}
