import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import PremiumSelect from '../ui/PremiumSelect.jsx';
import RichMathEditor from '../math/RichMathEditor.jsx';
import AdminQuestionWorkspace from './AdminQuestionWorkspace.jsx';
import { getApiErrorMessage } from '../../utils/apiError.js';

const SECTION_TEMPLATES = {
  reading_writing: { title: 'Reading and Writing Module', duration: 32 },
  math: { title: 'Math Module', duration: 35 },
  custom_practice: { title: 'Custom Practice Module', duration: 20 }
};

const typeOptions = [
  { value: 'FULL_LENGTH', label: 'Full Length SAT' },
  { value: 'PRACTICE', label: 'Practice Exam' },
  { value: 'CUSTOM', label: 'Custom Practice' }
];
const accessOptions = [
  { value: 'FREE', label: 'Free - all students' },
  { value: 'PAID', label: 'Premium students' }
];
const sourceOptions = [
  { value: 'MONOPREP', label: 'MonoPrep Exam' },
  { value: 'OFFICIAL', label: 'Official Exam' }
];
const publishOptions = [
  { value: 'false', label: 'Draft - publish later' },
  { value: 'true', label: 'Published - students can start' }
];
const competitionOptions = [
  { value: 'NONE', label: 'Regular practice exam' },
  { value: 'FULL', label: 'Monthly full competition' },
  { value: 'MATH', label: 'Biweekly math competition' },
  { value: 'ENGLISH', label: 'Biweekly English competition' }
];
const WIZARD_STEPS = ['Exam Setup', 'Modules', 'Questions'];

const defaultExamValues = {
  title: '', description: '', type: 'FULL_LENGTH', totalDuration: 87,
  source: 'MONOPREP', accessType: 'FREE', referenceText: '', isPublished: 'false',
  competitionKind: 'NONE', competitionStartsAt: '', competitionEndsAt: ''
};

const EXAM_FIELD_LABELS = {
  title: 'exam title',
  description: 'description',
  totalDuration: 'total minutes',
  competitionStartsAt: 'competition start time',
  competitionEndsAt: 'competition end time'
};

const MODULE_FIELD_LABELS = {
  title: 'module title',
  duration: 'duration',
  order: 'module order'
};

function requiredFieldMessage(errors, labels, fallback) {
  const fields = Object.keys(errors).map((field) => labels[field] || field);
  return fields.length ? `Complete the required fields: ${fields.join(', ')}.` : fallback;
}

export default function AdminExamBuilder({
  exams,
  passages = [],
  onCreateExam,
  onCreateSection,
  onCreatePassage,
  onCreateQuestion,
  onCreateQuestionHubItem,
  onUploadImage,
  onUploadPassageFile,
  openSignal = 0,
  hideTrigger = false
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [activeExamId, setActiveExamId] = useState('');
  const [createdSections, setCreatedSections] = useState([]);
  const [examStatus, setExamStatus] = useState(null);
  const [sectionStatus, setSectionStatus] = useState(null);
  const examForm = useForm({ defaultValues: defaultExamValues });
  const sectionForm = useForm({
    defaultValues: {
      title: SECTION_TEMPLATES.reading_writing.title,
      type: 'reading_writing',
      duration: SECTION_TEMPLATES.reading_writing.duration,
      order: 1
    }
  });

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    setStep(0);
    setActiveExamId('');
    setCreatedSections([]);
    setExamStatus(null);
    setSectionStatus(null);
    examForm.reset(defaultExamValues);
  }, [examForm]);

  useEffect(() => {
    if (openSignal > 0) openWizard();
  }, [openSignal, openWizard]);

  const activeExam = exams.find((exam) => exam.id === activeExamId);
  const activeSections = useMemo(() => {
    const sections = activeExam?.sections?.length ? activeExam.sections : createdSections;
    return (sections || [])
      .filter((section) => section.type !== 'listening')
      .map((section) => ({
        ...section,
        examId: activeExamId,
        examTitle: activeExam?.title || examForm.getValues('title')
      }));
  }, [activeExam, activeExamId, createdSections, examForm]);

  function applySectionTemplate(type) {
    const template = SECTION_TEMPLATES[type];
    sectionForm.setValue('type', type);
    sectionForm.setValue('title', template.title);
    sectionForm.setValue('duration', template.duration);
  }

  async function handleCreateExam(values) {
    setExamStatus({ type: 'pending', message: 'Creating exam...' });
    try {
      if (values.competitionKind !== 'NONE') {
        if (!values.competitionStartsAt || !values.competitionEndsAt) {
          throw new Error('Competition start and end dates are required.');
        }
        if (new Date(values.competitionEndsAt) <= new Date(values.competitionStartsAt)) {
          throw new Error('Competition end time must be after its start time.');
        }
      }

      const exam = await onCreateExam({
        title: values.title.trim(),
        description: values.description.trim(),
        type: values.type,
        accessType: values.accessType,
        source: values.source,
        contentMode: 'REAL_EXAM',
        totalDuration: Number(values.totalDuration),
        referenceText: values.referenceText?.trim() || null,
        isPublished: values.isPublished === 'true',
        competitionKind: values.competitionKind,
        competitionStartsAt: values.competitionKind !== 'NONE' ? new Date(values.competitionStartsAt).toISOString() : null,
        competitionEndsAt: values.competitionKind !== 'NONE' ? new Date(values.competitionEndsAt).toISOString() : null
      });

      setActiveExamId(exam.id);
      setExamStatus({ type: 'success', message: 'Exam created. Add its SAT modules next.' });
      sectionForm.reset({
        title: SECTION_TEMPLATES.reading_writing.title,
        type: 'reading_writing',
        duration: SECTION_TEMPLATES.reading_writing.duration,
        order: 1
      });
      setStep(1);
    } catch (error) {
      setExamStatus({ type: 'error', message: getApiErrorMessage(error, error.message || 'Exam could not be created.') });
    }
  }

  async function handleCreateSection(values) {
    setSectionStatus({ type: 'pending', message: 'Adding module...' });
    try {
      const section = await onCreateSection({
        examId: activeExamId,
        title: values.title.trim(),
        type: values.type,
        duration: Number(values.duration),
        order: Number(values.order)
      });
      setCreatedSections((current) => [...current, section]);
      sectionForm.reset({ ...values, title: '', order: Number(values.order) + 1 });
      setSectionStatus({ type: 'success', message: 'Module added. Add another or continue to questions.' });
    } catch (error) {
      setSectionStatus({ type: 'error', message: getApiErrorMessage(error, 'Module could not be created.') });
    }
  }

  function handleInvalidExam(errors) {
    setExamStatus({
      type: 'error',
      message: requiredFieldMessage(errors, EXAM_FIELD_LABELS, 'Complete the required exam details before continuing.')
    });
  }

  function handleInvalidSection(errors) {
    setSectionStatus({
      type: 'error',
      message: requiredFieldMessage(errors, MODULE_FIELD_LABELS, 'Complete the required module details before continuing.')
    });
  }

  if (hideTrigger && !wizardOpen) return null;

  return (
    <section className="sat-builder-shell wizard-builder-shell">
      <div className="builder-heading">
        <div><h2>SAT Exam Studio</h2><p>Create the exam, add its modules, then author questions in order.</p></div>
        {!wizardOpen && !hideTrigger ? <Button onClick={openWizard}><Plus aria-hidden="true" /> Create exam</Button> : null}
        {wizardOpen ? <Button variant="ghost" onClick={() => setWizardOpen(false)}>Close builder</Button> : null}
      </div>

      {wizardOpen ? (
        <div className="exam-wizard">
          <nav className="exam-wizard-steps" aria-label="Exam creation progress">
            {WIZARD_STEPS.map((label, index) => (
              <button key={label} type="button" className={`${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`.trim()} disabled={index > step || (index > 0 && !activeExamId)} onClick={() => setStep(index)}>
                <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>{label}
              </button>
            ))}
          </nav>

          {step === 0 ? (
            <Card title="Exam Setup" className="admin-builder-card exam-wizard-card compact-exam-setup">
              <form className="stack-form" noValidate onSubmit={examForm.handleSubmit(handleCreateExam, handleInvalidExam)}>
                <label className="form-field"><span>Title</span><input aria-invalid={Boolean(examForm.formState.errors.title)} placeholder="SAT Practice Test 02" {...examForm.register('title', { required: true, minLength: 3 })} />{examForm.formState.errors.title ? <small className="field-error-message">Enter an exam title with at least 3 characters.</small> : null}</label>
                <label className="form-field"><span>Description</span><textarea aria-invalid={Boolean(examForm.formState.errors.description)} placeholder="Describe this exam and its intended audience." {...examForm.register('description', { required: true, minLength: 10 })} />{examForm.formState.errors.description ? <small className="field-error-message">Add a clear description with at least 10 characters.</small> : null}</label>
                <div className="builder-field-row">
                  <div className="form-field"><span>Exam type</span><PremiumSelect ariaLabel="Exam type" value={examForm.watch('type')} onChange={(value) => examForm.setValue('type', value)} options={typeOptions} /></div>
                  <label className="form-field"><span>Total minutes</span><input aria-invalid={Boolean(examForm.formState.errors.totalDuration)} type="number" min="1" {...examForm.register('totalDuration', { required: true, min: 1 })} />{examForm.formState.errors.totalDuration ? <small className="field-error-message">Enter a duration of at least 1 minute.</small> : null}</label>
                </div>
                <div className="builder-field-row">
                  <div className="form-field"><span>Source</span><PremiumSelect ariaLabel="Exam source" value={examForm.watch('source')} onChange={(value) => examForm.setValue('source', value)} options={sourceOptions} /></div>
                  <div className="form-field"><span>Access</span><PremiumSelect ariaLabel="Exam access" value={examForm.watch('accessType')} onChange={(value) => examForm.setValue('accessType', value)} options={accessOptions} /></div>
                </div>
                <RichMathEditor form={examForm} name="referenceText" label="Shared exam reference" placeholder="Enter the Math reference once for this exam." showMathTemplates />
                <div className="form-field"><span>Competition schedule</span><PremiumSelect ariaLabel="Competition schedule" value={examForm.watch('competitionKind')} onChange={(value) => examForm.setValue('competitionKind', value)} options={competitionOptions} /></div>
                {examForm.watch('competitionKind') !== 'NONE' ? <div className="builder-field-row"><label className="form-field"><span>Starts at</span><input type="datetime-local" {...examForm.register('competitionStartsAt')} /></label><label className="form-field"><span>Ends at</span><input type="datetime-local" {...examForm.register('competitionEndsAt')} /></label></div> : null}
                <div className="form-field"><span>Publish status</span><PremiumSelect ariaLabel="Publish status" value={examForm.watch('isPublished')} onChange={(value) => examForm.setValue('isPublished', value)} options={publishOptions} /></div>
                {examStatus ? <p className={`support-status ${examStatus.type}`}>{examStatus.message}</p> : null}
                <div className="exam-wizard-actions"><Button type="submit" disabled={examStatus?.type === 'pending'}>{examStatus?.type === 'pending' ? 'Creating...' : 'Create exam'}</Button></div>
              </form>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card title="Add Modules" className="admin-builder-card exam-wizard-card">
              <form className="stack-form" noValidate onSubmit={sectionForm.handleSubmit(handleCreateSection, handleInvalidSection)}>
                <div className="module-template-grid" aria-label="Module templates">
                  {Object.keys(SECTION_TEMPLATES).map((type) => (
                    <button key={type} type="button" className={sectionForm.watch('type') === type ? 'active' : ''} onClick={() => applySectionTemplate(type)}>{type.replaceAll('_', ' ')}</button>
                  ))}
                </div>
                <label className="form-field"><span>Section title</span><input aria-invalid={Boolean(sectionForm.formState.errors.title)} {...sectionForm.register('title', { required: true, minLength: 2 })} />{sectionForm.formState.errors.title ? <small className="field-error-message">Enter a module title.</small> : null}</label>
                <div className="builder-field-row"><label className="form-field"><span>Duration</span><input type="number" min="1" {...sectionForm.register('duration', { required: true, min: 1 })} /></label><label className="form-field"><span>Order</span><input type="number" min="0" {...sectionForm.register('order', { required: true, min: 0 })} /></label></div>
                {sectionStatus ? <p className={`support-status ${sectionStatus.type}`}>{sectionStatus.message}</p> : null}
                <div className="exam-wizard-actions"><Button type="button" variant="ghost" onClick={() => setStep(0)}><ChevronLeft aria-hidden="true" /> Exam setup</Button><div><Button type="submit" disabled={sectionStatus?.type === 'pending'}>Add module</Button><Button type="button" disabled={!activeSections.length} onClick={() => setStep(2)}>Continue to questions</Button></div></div>
              </form>
            </Card>
          ) : null}

          {step === 2 ? (
            <div className="exam-wizard-questions">
              <AdminQuestionWorkspace sections={activeSections} passages={passages} onCreatePassage={onCreatePassage} onCreateQuestion={onCreateQuestion} onCreateQuestionHubItem={onCreateQuestionHubItem} onUploadImage={onUploadImage} onUploadPassageFile={onUploadPassageFile} />
              <div className="exam-wizard-actions"><Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft aria-hidden="true" /> Modules</Button><Button onClick={() => setWizardOpen(false)}>Finish</Button></div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
