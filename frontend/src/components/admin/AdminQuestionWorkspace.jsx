import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import AdminExamPreviewModal from './AdminExamPreviewModal.jsx';
import QuestionImage from '../exam/renderers/QuestionImage.jsx';
import PassageAssetViewer from '../exam/PassageAssetViewer.jsx';
import RichMathEditor from '../math/RichMathEditor.jsx';
import PremiumSelect from '../ui/PremiumSelect.jsx';
import { getApiErrorMessage } from '../../utils/apiError.js';

const READING_SKILLS = [
  'vocabulary', 'transitions', 'command_of_evidence', 'inference',
  'grammar', 'punctuation', 'rhetoric', 'main_idea'
];
const MATH_SKILLS = [
  'linear_equations', 'systems', 'functions', 'geometry', 'trigonometry',
  'statistics', 'probability', 'advanced_math', 'problem_solving'
];
const DEFAULT_SKILLS = ['reading', 'writing', 'algebra', 'analysis'];
const QUESTION_HUB_TOPICS = {
  reading_writing: [
    'Information and Ideas',
    'Craft and Structure',
    'Expression of Ideas',
    'Standard English Conventions'
  ],
  math: [
    'Algebra',
    'Advanced Math',
    'Problem-Solving and Data Analysis',
    'Geometry and Trigonometry'
  ]
};
const PASSAGE_MODE_OPTIONS = [
  { value: 'new', label: 'Write new passage' },
  { value: 'existing', label: 'Use saved passage' }
];
const RESPONSE_TYPE_OPTIONS = [
  { value: 'single_choice', label: 'Multiple choice' },
  { value: 'text_input', label: 'Student-produced response' }
];
const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' }
];
function getSkills(sectionType) {
  if (sectionType === 'reading_writing') return READING_SKILLS;
  if (sectionType === 'math') return MATH_SKILLS;
  return DEFAULT_SKILLS;
}

function titleForType(type) {
  return {
    reading_writing: 'Reading & Writing Builder',
    math: 'Math Builder',
    custom_practice: 'Custom Practice Builder'
  }[type] || 'Question Builder';
}

function getDefaults(section) {
  return {
    sectionId: section?.id || '',
    passageMode: 'new',
    passageId: '',
    passageTitle: '',
    passageCategory: 'reading',
    passageContent: '',
    passageAttachmentUrl: '',
    passageAttachmentName: '',
    passageAttachmentMimeType: '',
    responseType: 'single_choice',
    skill: getSkills(section?.type)[0],
    addToQuestionHub: false,
    questionHubDomain: (QUESTION_HUB_TOPICS[section?.type] || [])[0] || '',
    difficulty: 'MEDIUM',
    questionText: '',
    formulaText: '',
    imageUrl: '',
    tableData: '',
    calculatorAllowed: section?.type === 'math',
    audioUrl: '',
    audioTitle: '',
    instructions: '',
    transcript: '',
    audioReplayLimit: 'unlimited',
    explanation: '',
    explanationImageUrl: '',
    order: (section?.questionsCount || 0) + 1,
    correctOption: 'A',
    acceptedAnswers: '',
    optionA: '',
    optionAImageUrl: '',
    optionB: '',
    optionBImageUrl: '',
    optionC: '',
    optionCImageUrl: '',
    optionD: '',
    optionDImageUrl: ''
  };
}

function splitAnswers(value) {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseTableData(value) {
  if (!value.trim()) return null;
  return JSON.parse(value);
}

function buildOptions(values) {
  return ['A', 'B', 'C', 'D']
    .map((label, index) => ({
      label,
      text: values[`option${label}`]?.trim() || '',
      imageUrl: values[`option${label}ImageUrl`]?.trim() || null,
      isCorrect: values.correctOption.trim().toUpperCase() === label,
      order: index + 1
    }))
    .filter((option) => option.text);
}

export default function AdminQuestionWorkspace({
  sections = [],
  passages = [],
  onCreatePassage,
  onCreateQuestion,
  onCreateQuestionHubItem,
  onUploadImage,
  onUploadPassageFile
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const [selectedExamId, setSelectedExamId] = useState(sections[0]?.examId || '');
  const [editorOpen, setEditorOpen] = useState(() => sections.length === 1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [uploadingImageField, setUploadingImageField] = useState('');
  const [uploadingPassageFile, setUploadingPassageFile] = useState(false);
  const examOptions = useMemo(() => {
    const byExam = new Map();
    sections.forEach((section) => {
      const id = section.examId || section.examTitle;
      if (!id) return;
      const current = byExam.get(id) || {
        id,
        title: section.examTitle || 'Untitled test',
        modules: 0,
        questions: 0
      };
      current.modules += 1;
      current.questions += section.questionsCount || 0;
      byExam.set(id, current);
    });
    return Array.from(byExam.values());
  }, [sections]);
  const visibleSections = useMemo(() => {
    if (!selectedExamId) return sections;
    return sections.filter((section) => (section.examId || section.examTitle) === selectedExamId);
  }, [sections, selectedExamId]);
  const activeSection =
    visibleSections.find((section) => section.id === activeSectionId)
    || sections.find((section) => section.id === activeSectionId)
    || visibleSections[0]
    || sections[0];
  const form = useForm({ defaultValues: getDefaults(activeSection) });
  const values = useWatch({ control: form.control });
  const sectionType = activeSection?.type;
  const responseType = sectionType === 'reading_writing'
    ? 'single_choice'
    : values.responseType;
  const isTextResponse = responseType === 'text_input';
  const usesOptions = !isTextResponse;
  const skills = getSkills(sectionType);

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId('');
      setSelectedExamId('');
      setEditorOpen(false);
      return;
    }
    if (sections.length === 1) {
      setEditorOpen(true);
    }
    const selectedStillExists = selectedExamId
      ? sections.some((section) => (section.examId || section.examTitle) === selectedExamId)
      : false;
    const nextExamId = selectedStillExists ? selectedExamId : (sections[0].examId || sections[0].examTitle || '');
    if (nextExamId !== selectedExamId) {
      setSelectedExamId(nextExamId);
    }
    const nextSections = nextExamId
      ? sections.filter((section) => (section.examId || section.examTitle) === nextExamId)
      : sections;
    if (!nextSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(nextSections[0]?.id || sections[0].id);
    }
  }, [activeSectionId, sections, selectedExamId]);

  function selectExam(valueOrEvent) {
    const nextExamId = valueOrEvent?.target?.value ?? valueOrEvent;
    const nextSection = sections.find((section) => (section.examId || section.examTitle) === nextExamId);
    setSelectedExamId(nextExamId);
    if (nextSection) {
      setActiveSectionId(nextSection.id);
    }
    setEditorOpen(false);
    setStatus(null);
  }

  useEffect(() => {
    if (activeSection && editorOpen) {
      const defaults = getDefaults(activeSection);
      form.reset(defaults);
      setStatus(null);
    }
  }, [activeSection?.id]);

  function openEditor() {
    if (!activeSection) return;
    const defaults = getDefaults(activeSection);
    form.reset(defaults);
    setStatus(null);
    setEditorOpen(true);
  }

  function handleInvalidQuestion(errors) {
    const labels = {
      questionText: 'question text',
      passageTitle: 'passage title',
      passageCategory: 'passage category',
      skill: 'skill',
      explanation: 'explanation',
      order: 'question order',
      optionA: 'answer A',
      optionB: 'answer B',
      optionC: 'answer C',
      optionD: 'answer D'
    };
    const missing = Object.keys(errors).map((field) => labels[field] || field).slice(0, 4);
    setStatus({
      type: 'error',
      message: missing.length
        ? `Complete the required fields: ${missing.join(', ')}.`
        : 'Complete the required question fields before saving.'
    });
  }

  async function handleImageUpload(event, fieldName, successMessage) {
    const file = event.target.files?.[0];
    if (!file || !onUploadImage) return;

    setUploadingImageField(fieldName);
    setStatus({ type: 'pending', message: 'Uploading image...' });
    try {
      const url = await onUploadImage(file);
      form.setValue(fieldName, url, { shouldDirty: true });
      setStatus({ type: 'success', message: successMessage });
    } catch (error) {
      event.target.value = '';
      setStatus({ type: 'error', message: getApiErrorMessage(error, 'Image could not be uploaded.') });
    } finally {
      setUploadingImageField('');
    }
  }

  async function handlePassageFileUpload(file) {
    if (!file || !onUploadPassageFile) return;
    setUploadingPassageFile(true);
    setStatus({ type: 'pending', message: 'Uploading passage material...' });
    try {
      const uploaded = await onUploadPassageFile(file);
      form.setValue('passageAttachmentUrl', uploaded.url, { shouldDirty: true });
      form.setValue('passageAttachmentName', uploaded.name, { shouldDirty: true });
      form.setValue('passageAttachmentMimeType', uploaded.mimeType, { shouldDirty: true });
      setStatus({ type: 'success', message: 'Passage material is ready for preview.' });
    } catch (error) {
      setStatus({ type: 'error', message: getApiErrorMessage(error, 'Passage material could not be uploaded.') });
    } finally {
      setUploadingPassageFile(false);
    }
  }

  function clearPassageFile() {
    form.setValue('passageAttachmentUrl', '', { shouldDirty: true });
    form.setValue('passageAttachmentName', '', { shouldDirty: true });
    form.setValue('passageAttachmentMimeType', '', { shouldDirty: true });
  }

  const previewQuestion = useMemo(() => {
    const selectedPassage = passages.find((passage) => passage.id === values.passageId);
    const draftPassage = values.passageMode === 'existing'
      ? selectedPassage
      : {
          title: values.passageTitle || 'Untitled passage',
          category: values.passageCategory || 'reading',
          content: values.passageContent || '',
          attachmentUrl: values.passageAttachmentUrl || null,
          attachmentName: values.passageAttachmentName || null,
          attachmentMimeType: values.passageAttachmentMimeType || null
        };
    let tableData = null;
    try {
      tableData = parseTableData(values.tableData || '');
    } catch (_error) {
      tableData = null;
    }
    return {
      id: 'preview-question',
      type: sectionType === 'reading_writing'
        ? 'passage_question'
        : responseType,
      skill: values.skill,
      difficulty: values.difficulty,
      questionText: values.questionText || 'Your question prompt appears here.',
      passage: sectionType === 'reading_writing' ? draftPassage : null,
      formulaText: values.formulaText || null,
      imageUrl: values.imageUrl || null,
      tableData,
      calculatorAllowed: Boolean(values.calculatorAllowed),
      audioUrl: values.audioUrl || null,
      audioTitle: values.audioTitle || null,
      instructions: values.instructions || null,
      audioReplayLimit: values.audioReplayLimit === 'unlimited' ? null : Number(values.audioReplayLimit),
      options: usesOptions ? buildOptions(values) : []
    };
  }, [passages, responseType, sectionType, usesOptions, values]);

  async function handleSaveQuestion(submittedValues) {
    if (!activeSection) return;
    const options = buildOptions(submittedValues);
    const acceptedAnswers = splitAnswers(submittedValues.acceptedAnswers || '');
    const correctLabel = submittedValues.correctOption.trim().toUpperCase();

    if (usesOptions && options.length !== 4) {
      setStatus({ type: 'error', message: 'Provide all four answer choices for SAT multiple choice items.' });
      return;
    }
    if (usesOptions && !options.some((option) => option.label === correctLabel)) {
      setStatus({ type: 'error', message: 'Select a correct option from A, B, C, or D.' });
      return;
    }
    if (isTextResponse && acceptedAnswers.length === 0) {
      setStatus({ type: 'error', message: 'Enter at least one accepted numeric or text answer.' });
      return;
    }
    if (sectionType === 'reading_writing' && submittedValues.passageMode === 'existing' && !submittedValues.passageId) {
      setStatus({ type: 'error', message: 'Choose a saved passage before saving the question.' });
      return;
    }
    if (
      sectionType === 'reading_writing'
      && submittedValues.passageMode === 'new'
      && submittedValues.passageContent.trim().length < 20
      && !submittedValues.passageAttachmentUrl
    ) {
      setStatus({ type: 'error', message: 'Write at least 20 characters or attach a PDF, Word, or image file.' });
      return;
    }

    let tableData;
    try {
      tableData = parseTableData(submittedValues.tableData || '');
    } catch (_error) {
      setStatus({ type: 'error', message: 'Table data must be valid JSON before saving.' });
      return;
    }

    setStatus({ type: 'pending', message: 'Saving SAT item...' });
    try {
      let passageId = null;
      if (sectionType === 'reading_writing') {
        if (submittedValues.passageMode === 'existing') {
          passageId = submittedValues.passageId;
        } else {
          const passage = await onCreatePassage({
            title: submittedValues.passageTitle.trim(),
            category: submittedValues.passageCategory.trim(),
            content: submittedValues.passageContent.trim(),
            attachmentUrl: submittedValues.passageAttachmentUrl || null,
            attachmentName: submittedValues.passageAttachmentName || null,
            attachmentMimeType: submittedValues.passageAttachmentMimeType || null
          });
          passageId = passage.id;
        }
      }

      await onCreateQuestion({
        sectionId: activeSection.id,
        passageId,
        type: sectionType === 'reading_writing'
          ? 'passage_question'
          : responseType,
        skill: submittedValues.skill,
        difficulty: submittedValues.difficulty,
        questionText: submittedValues.questionText.trim(),
        audioUrl: null,
        audioTitle: null,
        instructions: null,
        transcript: null,
        audioReplayLimit: null,
        imageUrl: sectionType === 'math' ? submittedValues.imageUrl || null : null,
        formulaText: sectionType === 'math' ? submittedValues.formulaText || null : null,
        tableData: sectionType === 'math' ? tableData : null,
        calculatorAllowed: sectionType === 'math' && Boolean(submittedValues.calculatorAllowed),
        acceptedAnswers: isTextResponse ? acceptedAnswers : null,
        correctAnswer: isTextResponse ? { acceptedAnswers } : { value: correctLabel },
        explanation: submittedValues.explanation.trim(),
        explanationImageUrl: submittedValues.explanationImageUrl || null,
        order: Number(submittedValues.order),
        options: usesOptions ? options : []
      });

      let questionHubCopyCreated = false;
      let questionHubCopyError = '';
      if (submittedValues.addToQuestionHub && onCreateQuestionHubItem) {
        try {
          await onCreateQuestionHubItem({
            subject: sectionType === 'math' ? 'Math' : 'Reading & Writing',
            domain: submittedValues.questionHubDomain,
            skill: submittedValues.skill,
            difficulty: submittedValues.difficulty,
            prompt: submittedValues.questionText.trim(),
            choices: usesOptions
              ? options.map(({ label, text, imageUrl }) => ({ label, text, imageUrl }))
              : null,
            correctAnswer: isTextResponse ? { acceptedAnswers } : { value: correctLabel },
            explanation: submittedValues.explanation.trim() || null,
            isBluebook: true,
            isActive: true
          });
          questionHubCopyCreated = true;
        } catch (error) {
          questionHubCopyError = getApiErrorMessage(error, 'Question Hub copy could not be created.');
        }
      }

      const nextDefaults = { ...getDefaults(activeSection), order: Number(submittedValues.order) + 1 };
      form.reset(nextDefaults);
      setStatus({
        type: questionHubCopyError ? 'error' : 'success',
        message: questionHubCopyError
          ? `Question saved to the exam, but ${questionHubCopyError}`
          : questionHubCopyCreated
            ? 'Question saved to the module and Question Hub.'
            : 'Question saved to this module. The editor is ready for the next item.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: getApiErrorMessage(error, 'Question could not be saved.') });
    }
  }

  return (
    <div className="authoring-workspace">
      <aside className="builder-section-rail">
        <div className="builder-rail-head">
          <h3>3. Author Questions</h3>
          <p>Select a module to load its SAT-specific builder.</p>
        </div>
        {examOptions.length > 1 ? (
          <label className="form-field builder-test-dropdown">
            <span>Test</span>
            <PremiumSelect
              ariaLabel="Select test"
              value={selectedExamId}
              onChange={selectExam}
              options={examOptions.map((exam) => ({
                value: exam.id,
                label: `${exam.title} - ${exam.modules} modules / ${exam.questions} questions`
              }))}
            />
          </label>
        ) : null}
        <div className="builder-section-list">
          {visibleSections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={section.id === activeSection?.id ? 'active' : ''}
              onClick={() => {
                setActiveSectionId(section.id);
                setEditorOpen(false);
                setStatus(null);
              }}
            >
              <strong>{section.title}</strong>
              <span>{section.type.replaceAll('_', ' ')} / {section.duration} min</span>
              <small>{section.questionsCount} questions</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="builder-editor-stage">
        {!activeSection ? (
          <div className="builder-empty">
            <h3>No modules yet</h3>
            <p>Create an exam and add a Reading & Writing, Math, or Custom Practice module first.</p>
          </div>
        ) : (
          <>
            <header className="builder-editor-header">
              <div>
                <span>{activeSection.examTitle}</span>
                <h3>{titleForType(activeSection.type)}</h3>
                <p>{activeSection.title} / {activeSection.duration} minutes</p>
              </div>
              <Button onClick={openEditor}>{editorOpen ? 'New Question' : 'Add Question'}</Button>
            </header>
            <AnimatePresence mode="wait">
              {!editorOpen ? (
                <motion.div
                  className="builder-empty builder-empty-compact"
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3>Ready to author</h3>
                  <p>Open the {titleForType(activeSection.type)} to create the next question and preview it as a student.</p>
                </motion.div>
              ) : (
                <motion.form
                  key={activeSection.type}
                  className={`sat-question-editor editor-${activeSection.type}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={form.handleSubmit(handleSaveQuestion, handleInvalidQuestion)}
                >
                  {sectionType === 'reading_writing' ? (
                    <ReadingFields
                      form={form}
                      values={values}
                      passages={passages}
                      uploadingPassageFile={uploadingPassageFile}
                      onPassageFileUpload={handlePassageFileUpload}
                      onClearPassageFile={clearPassageFile}
                    />
                  ) : null}
                  {sectionType === 'math' ? (
                    <MathFields
                      form={form}
                      isTextResponse={isTextResponse}
                      imageUrl={values.imageUrl}
                      imageUploading={uploadingImageField === 'imageUrl'}
                      onImageUpload={(event) => handleImageUpload(
                        event,
                        'imageUrl',
                        'Image uploaded and attached to this math question.'
                      )}
                    />
                  ) : null}
                  {sectionType === 'custom_practice' ? (
                    <CustomFields form={form} isTextResponse={isTextResponse} />
                  ) : null}
                  <CommonAnswerFields
                    form={form}
                    skills={skills}
                    values={values}
                    isTextResponse={isTextResponse}
                    usesOptions={usesOptions}
                    mathEnabled={sectionType === 'math'}
                    skillLabel="Skill"
                    uploadingImageField={uploadingImageField}
                    onImageUpload={(event, fieldName, successMessage) => handleImageUpload(
                      event,
                      fieldName,
                      successMessage
                    )}
                  />
                  {QUESTION_HUB_TOPICS[sectionType]?.length ? (
                    <section className={`question-hub-publish-panel ${values.addToQuestionHub ? 'active' : ''}`.trim()}>
                      <label className="question-hub-publish-toggle">
                        <input type="checkbox" {...form.register('addToQuestionHub')} />
                        <span aria-hidden="true" />
                        <div>
                          <strong>Also add to Question Hub</strong>
                          <small>Keep this question in the exam module and publish a free standalone practice copy.</small>
                        </div>
                      </label>
                      {values.addToQuestionHub ? (
                        <div className="form-field question-hub-topic-field">
                          <span>SAT topic</span>
                          <PremiumSelect
                            ariaLabel="Question Hub SAT topic"
                            value={values.questionHubDomain}
                            onChange={(value) => form.setValue('questionHubDomain', value, { shouldDirty: true })}
                            options={QUESTION_HUB_TOPICS[sectionType].map((topic) => ({ value: topic, label: topic }))}
                          />
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                  {status ? (
                    <p className={`support-status ${status.type === 'pending' ? '' : status.type}`}>
                      {status.message}
                    </p>
                  ) : null}
                  <div className="builder-save-actions">
                    <Button variant="ghost" onClick={() => setPreviewOpen(true)}>Preview student view</Button>
                    <Button type="submit" disabled={status?.type === 'pending' || Boolean(uploadingImageField) || uploadingPassageFile}>
                      {uploadingImageField || uploadingPassageFile ? 'Uploading material...' : status?.type === 'pending' ? 'Saving...' : 'Save Question'}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <AdminExamPreviewModal
        open={previewOpen}
        section={activeSection}
        question={previewQuestion}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

function ReadingFields({ form, values, passages, uploadingPassageFile, onPassageFileUpload, onClearPassageFile }) {
  const selectedPassage = passages.find((passage) => passage.id === values.passageId);
  const draftPassage = values.passageAttachmentUrl ? {
    attachmentUrl: values.passageAttachmentUrl,
    attachmentName: values.passageAttachmentName,
    attachmentMimeType: values.passageAttachmentMimeType
  } : null;

  return (
    <div className="reading-editor-grid">
      <fieldset className="editor-panel passage-editor">
        <legend>Passage Editor</legend>
        <div className="form-field">
          <span>Passage source</span>
          <PremiumSelect
            ariaLabel="Passage source"
            value={values.passageMode}
            options={PASSAGE_MODE_OPTIONS}
            onChange={(value) => form.setValue('passageMode', value, { shouldDirty: true })}
          />
        </div>
        {values.passageMode === 'existing' ? (
          <div className="form-field">
            <span>Saved passage</span>
            <PremiumSelect
              ariaLabel="Saved passage"
              value={values.passageId}
              options={[
                { value: '', label: 'Choose passage', disabled: true },
                ...passages.map((passage) => ({ value: passage.id, label: passage.title }))
              ]}
              onChange={(value) => form.setValue('passageId', value, { shouldDirty: true, shouldValidate: true })}
            />
            {selectedPassage?.attachmentUrl ? <PassageAssetViewer passage={selectedPassage} compact /> : null}
          </div>
        ) : (
          <>
            <label className="form-field">
              <span>Passage title</span>
              <input {...form.register('passageTitle', { required: true, minLength: 2 })} />
            </label>
            <label className="form-field">
              <span>Category</span>
              <input {...form.register('passageCategory', { required: true, minLength: 2 })} />
            </label>
            <label className="form-field">
              <span>Passage content</span>
              <textarea className="passage-author-text" placeholder="Optional when a passage file is attached" {...form.register('passageContent')} />
            </label>
            <div className="form-field">
              <span>Passage material</span>
              <label className="passage-file-picker">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploadingPassageFile}
                  onChange={(event) => {
                    onPassageFileUpload(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
                <Upload aria-hidden="true" />
                <span><b>{uploadingPassageFile ? 'Uploading material...' : 'Choose PDF, Word, or image'}</b><small>Shown inside the admin preview and student exam</small></span>
              </label>
              {draftPassage ? (
                <>
                  <div className="passage-file-chip">
                    <FileText aria-hidden="true" />
                    <span>{values.passageAttachmentName || 'Attached material'}</span>
                    <button type="button" aria-label="Remove passage material" onClick={onClearPassageFile}><X aria-hidden="true" /></button>
                  </div>
                  <PassageAssetViewer passage={draftPassage} compact />
                </>
              ) : null}
            </div>
          </>
        )}
      </fieldset>
      <QuestionPromptFields form={form} />
    </div>
  );
}

function MathFields({ form, isTextResponse, imageUrl, imageUploading, onImageUpload }) {
  const responseType = form.watch('responseType');
  return (
    <div className="math-editor-grid">
      <QuestionPromptFields form={form} mathEnabled>
        <div className="form-field">
          <span>Response type</span>
          <PremiumSelect
            ariaLabel="Response type"
            value={responseType}
            options={RESPONSE_TYPE_OPTIONS}
            onChange={(value) => form.setValue('responseType', value, { shouldDirty: true })}
          />
        </div>
      </QuestionPromptFields>
      <fieldset className="editor-panel reference-editor">
        <legend>Reference & Media</legend>
        <RichMathEditor
          form={form}
          name="formulaText"
          label="Question formula (optional)"
          placeholder="Formula shown with this question only, for example: \\[y=mx+b\\]"
          showMathTemplates
        />
        <label className="form-field media-upload-field">
          <span>Upload graph or image</span>
          <input
            key={imageUrl || 'empty-image'}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={imageUploading}
            onChange={onImageUpload}
          />
          <small>PNG, JPG, WEBP, or GIF. Maximum 5 MB.</small>
        </label>
        <label className="form-field">
          <span>Uploaded image URL / external URL</span>
          <input placeholder="/uploads/images/graph.png" {...form.register('imageUrl')} />
        </label>
        {imageUrl ? (
          <div className="builder-image-preview">
            <QuestionImage src={imageUrl} alt="Uploaded math question preview" />
            <Button type="button" variant="ghost" onClick={() => form.setValue('imageUrl', '')}>
              Remove from question
            </Button>
          </div>
        ) : null}
        <label className="form-field">
          <span>Table data (JSON)</span>
          <textarea placeholder={'{\"headers\":[\"x\",\"y\"],\"rows\":[[\"1\",\"4\"],[\"2\",\"7\"]]}'} {...form.register('tableData')} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" {...form.register('calculatorAllowed')} />
          Calculator allowed
        </label>
        {isTextResponse ? <p className="helper-copy">Numeric answers are normalized before scoring.</p> : null}
      </fieldset>
    </div>
  );
}

function CustomFields({ form }) {
  const responseType = form.watch('responseType');
  return (
    <div className="custom-editor-grid">
      <QuestionPromptFields form={form}>
        <div className="form-field">
          <span>Response type</span>
          <PremiumSelect
            ariaLabel="Response type"
            value={responseType}
            options={RESPONSE_TYPE_OPTIONS}
            onChange={(value) => form.setValue('responseType', value, { shouldDirty: true })}
          />
        </div>
      </QuestionPromptFields>
    </div>
  );
}

function QuestionPromptFields({ form, children, mathEnabled = false }) {
  return (
    <fieldset className="editor-panel question-editor">
      <legend>Question Editor</legend>
      {children}
      <RichMathEditor
        form={form}
        name="questionText"
        label="Question text"
        className="question-author-text"
        placeholder={mathEnabled ? 'The function \\(f\\) is defined by \\(f(x)=a^x+b\\)...' : 'Write the question prompt.'}
        rules={{ required: true, minLength: 3 }}
        showMathTemplates={mathEnabled}
      />
    </fieldset>
  );
}

function CommonAnswerFields({
  form,
  skills,
  values,
  isTextResponse,
  usesOptions,
  mathEnabled,
  skillLabel = 'Skill',
  uploadingImageField,
  onImageUpload
}) {
  return (
    <fieldset className="editor-panel answer-editor">
      <legend>Scoring & Answer Key</legend>
      <div className="answer-meta-grid">
        <div className="form-field">
          <span>{skillLabel}</span>
          <PremiumSelect
            ariaLabel={skillLabel}
            value={values.skill}
            options={skills.map((skill) => ({ value: skill, label: skill.replaceAll('_', ' ') }))}
            onChange={(value) => form.setValue('skill', value, { shouldDirty: true })}
          />
        </div>
        <div className="form-field">
          <span>Difficulty</span>
          <PremiumSelect
            ariaLabel="Question difficulty"
            value={values.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(value) => form.setValue('difficulty', value, { shouldDirty: true })}
          />
        </div>
        <label className="form-field">
          <span>Order</span>
          <input type="number" min="0" {...form.register('order', { required: true, min: 0 })} />
        </label>
      </div>
      {usesOptions ? (
        <div className={`question-options-grid ${mathEnabled ? 'with-math-options' : ''}`.trim()}>
            {['A', 'B', 'C', 'D'].map((label) => {
              const selectedCorrect = values.correctOption === label;
              const imageField = `option${label}ImageUrl`;
              const imageUrl = values[imageField] || '';

              return (
                <div key={label} className={`option-author-block ${mathEnabled ? 'option-author-math' : 'option-author-compact'} ${selectedCorrect ? 'correct' : ''}`.trim()}>
                  <div className="option-author-heading">
                    <span>Option {label}</span>
                    <button type="button" className={selectedCorrect ? 'selected' : ''} onClick={() => form.setValue('correctOption', label, { shouldDirty: true })}>
                      <CheckCircle2 aria-hidden="true" /> {selectedCorrect ? 'Correct answer' : 'Mark correct'}
                    </button>
                  </div>
                  {mathEnabled ? (
                    <RichMathEditor
                      form={form}
                      name={`option${label}`}
                      label={`Answer ${label}`}
                      className="option-rich-math-editor"
                      placeholder={`Write answer ${label} with text or formulas.`}
                      rules={{ required: true }}
                      showMathTemplates
                    />
                  ) : (
                    <label className="form-field">
                      <span>Answer text</span>
                      <input {...form.register(`option${label}`, { required: true })} />
                    </label>
                  )}
                  {mathEnabled ? (
                    <>
                      <label className="form-field media-upload-field option-media-upload">
                        <span>Option {label} image</span>
                        <input
                          key={imageUrl || `${imageField}-empty`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          disabled={uploadingImageField === imageField}
                          onChange={(event) => onImageUpload(
                            event,
                            imageField,
                            `Image uploaded for option ${label}.`
                          )}
                        />
                        <small>Upload an image file when this answer needs a graph or diagram.</small>
                      </label>
                      {imageUrl ? (
                        <div className="builder-image-preview option-image-preview">
                          <QuestionImage src={imageUrl} alt={`Preview for option ${label}`} />
                          <Button type="button" variant="ghost" onClick={() => form.setValue(imageField, '', { shouldDirty: true })}>
                            Remove image
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            })}
        </div>
      ) : (
        <label className="form-field">
          <span>Accepted answers (comma separated)</span>
          <input placeholder="3, 3.0, 6/2" {...form.register('acceptedAnswers', { required: isTextResponse })} />
        </label>
      )}
      <RichMathEditor
        form={form}
        name="explanation"
        label="Explanation / worked solution"
        className="explanation-rich-math-editor"
        placeholder="Explain each step and include formulas where needed."
        rules={{ required: true, minLength: 5 }}
        showMathTemplates={mathEnabled}
      />
      <label className="form-field media-upload-field explanation-media-upload">
        <span>Explanation image</span>
        <input
          key={values.explanationImageUrl || 'explanation-image-empty'}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploadingImageField === 'explanationImageUrl'}
          onChange={(event) => onImageUpload(
            event,
            'explanationImageUrl',
            'Explanation image uploaded.'
          )}
        />
        <small>Upload a worked graph, diagram, or solution image. No URL is required.</small>
      </label>
      {values.explanationImageUrl ? (
        <div className="builder-image-preview explanation-image-preview">
          <QuestionImage src={values.explanationImageUrl} alt="Explanation image preview" />
          <Button type="button" variant="ghost" onClick={() => form.setValue('explanationImageUrl', '', { shouldDirty: true })}>
            Remove image
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
