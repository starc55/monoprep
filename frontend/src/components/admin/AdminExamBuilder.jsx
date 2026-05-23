import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import AdminQuestionWorkspace from './AdminQuestionWorkspace.jsx';
import { getApiErrorMessage } from '../../utils/apiError.js';

const SECTION_TEMPLATES = {
  reading_writing: { title: 'Reading and Writing Module', duration: 32 },
  math: { title: 'Math Module', duration: 35 },
  listening: { title: 'Listening Practice Module', duration: 20 },
  custom_practice: { title: 'Custom Practice Module', duration: 20 }
};

export default function AdminExamBuilder({
  exams,
  passages = [],
  onCreateExam,
  onCreateSection,
  onCreatePassage,
  onCreateQuestion,
  onUploadImage
}) {
  const [examStatus, setExamStatus] = useState(null);
  const [sectionStatus, setSectionStatus] = useState(null);
  const examForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      type: 'FULL_LENGTH',
      totalDuration: 87,
      isPublished: false
    }
  });
  const sectionForm = useForm({
    defaultValues: {
      examId: exams[0]?.id || '',
      title: SECTION_TEMPLATES.reading_writing.title,
      type: 'reading_writing',
      duration: SECTION_TEMPLATES.reading_writing.duration,
      order: 1
    }
  });
  const sections = exams.flatMap((exam) =>
    exam.sections.map((section) => ({
      ...section,
      examTitle: exam.title
    }))
  );

  useEffect(() => {
    if (exams[0]?.id && !sectionForm.getValues('examId')) {
      sectionForm.setValue('examId', exams[0].id);
    }
  }, [exams, sectionForm]);

  function applySectionTemplate(type) {
    const template = SECTION_TEMPLATES[type];
    sectionForm.setValue('type', type);
    sectionForm.setValue('title', template.title);
    sectionForm.setValue('duration', template.duration);
  }

  async function handleCreateExam(values) {
    setExamStatus({ type: 'pending', message: 'Creating exam...' });
    try {
      await onCreateExam({ ...values, totalDuration: Number(values.totalDuration) });
      examForm.reset();
      setExamStatus({ type: 'success', message: 'Exam created. Add modules next.' });
    } catch (error) {
      setExamStatus({ type: 'error', message: getApiErrorMessage(error, 'Exam could not be created.') });
    }
  }

  async function handleCreateSection(values) {
    setSectionStatus({ type: 'pending', message: 'Adding module...' });
    try {
      await onCreateSection({
        ...values,
        duration: Number(values.duration),
        order: Number(values.order)
      });
      sectionForm.reset({
        ...values,
        title: '',
        order: Number(values.order) + 1
      });
      setSectionStatus({ type: 'success', message: 'Module added to the exam outline.' });
    } catch (error) {
      setSectionStatus({
        type: 'error',
        message: getApiErrorMessage(error, 'Section could not be created.')
      });
    }
  }

  return (
    <section className="sat-builder-shell">
      <div className="builder-heading">
        <div>
          <h2>SAT Exam Builder</h2>
          <p>Build modules first, then author Bluebook-style questions for the selected module.</p>
        </div>
      </div>

      <div className="builder-setup-grid">
        <Card title="1. Exam Setup" className="admin-builder-card">
          <form className="stack-form" onSubmit={examForm.handleSubmit(handleCreateExam)}>
            <label className="form-field">
              <span>Exam title</span>
              <input placeholder="SAT Practice Test 02" {...examForm.register('title', { required: true, minLength: 3 })} />
            </label>
            <label className="form-field">
              <span>Description</span>
              <textarea placeholder="Describe this assessment and its intended audience." {...examForm.register('description', { required: true, minLength: 10 })} />
            </label>
            <div className="builder-field-row">
              <label className="form-field">
                <span>Exam type</span>
                <select {...examForm.register('type')}>
                  <option value="FULL_LENGTH">Full Length SAT</option>
                  <option value="PRACTICE">Practice</option>
                  <option value="CUSTOM">Custom Practice</option>
                </select>
              </label>
              <label className="form-field">
                <span>Total minutes</span>
                <input type="number" min="1" {...examForm.register('totalDuration', { required: true, min: 1 })} />
              </label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" {...examForm.register('isPublished')} />
              Published and available to students
            </label>
            {examStatus ? (
              <p className={`support-status ${examStatus.type === 'pending' ? '' : examStatus.type}`}>
                {examStatus.message}
              </p>
            ) : null}
            <Button type="submit" disabled={examStatus?.type === 'pending'}>Create exam</Button>
          </form>
        </Card>

        <Card title="2. Add Modules" className="admin-builder-card">
          <form className="stack-form" onSubmit={sectionForm.handleSubmit(handleCreateSection)}>
            <label className="form-field">
              <span>Exam</span>
              <select {...sectionForm.register('examId', { required: true })}>
                <option value="">Select an exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </label>
            <div className="module-template-grid" aria-label="Module templates">
              {Object.keys(SECTION_TEMPLATES).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={sectionForm.watch('type') === type ? 'active' : ''}
                  onClick={() => applySectionTemplate(type)}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
            <label className="form-field">
              <span>Section title</span>
              <input {...sectionForm.register('title', { required: true, minLength: 2 })} />
            </label>
            <div className="builder-field-row">
              <label className="form-field">
                <span>Duration</span>
                <input type="number" min="1" {...sectionForm.register('duration', { required: true, min: 1 })} />
              </label>
              <label className="form-field">
                <span>Order</span>
                <input type="number" min="0" {...sectionForm.register('order', { required: true, min: 0 })} />
              </label>
            </div>
            {sectionStatus ? (
              <p className={`support-status ${sectionStatus.type === 'pending' ? '' : sectionStatus.type}`}>
                {sectionStatus.message}
              </p>
            ) : null}
            <Button type="submit" disabled={sectionStatus?.type === 'pending' || exams.length === 0}>
              Add module
            </Button>
          </form>
        </Card>
      </div>

      <AdminQuestionWorkspace
        sections={sections}
        passages={passages}
        onCreatePassage={onCreatePassage}
        onCreateQuestion={onCreateQuestion}
        onUploadImage={onUploadImage}
      />
    </section>
  );
}
