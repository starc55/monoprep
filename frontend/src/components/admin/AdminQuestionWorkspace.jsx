import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import AdminExamPreviewModal from './AdminExamPreviewModal.jsx';
import QuestionImage from '../exam/renderers/QuestionImage.jsx';
import { getApiErrorMessage } from '../../utils/apiError.js';

const READING_SKILLS = [
  'vocabulary', 'transitions', 'command_of_evidence', 'inference',
  'grammar', 'punctuation', 'rhetoric', 'main_idea'
];
const MATH_SKILLS = [
  'linear_equations', 'systems', 'functions', 'geometry', 'trigonometry',
  'statistics', 'probability', 'advanced_math', 'problem_solving'
];
const LISTENING_SKILLS = ['main_idea', 'detail', 'inference', 'vocabulary', 'speaker_purpose'];
const DEFAULT_SKILLS = ['reading', 'writing', 'algebra', 'analysis'];

function getSkills(sectionType) {
  if (sectionType === 'reading_writing') return READING_SKILLS;
  if (sectionType === 'math') return MATH_SKILLS;
  if (sectionType === 'listening') return LISTENING_SKILLS;
  return DEFAULT_SKILLS;
}

function titleForType(type) {
  return {
    reading_writing: 'Reading & Writing Builder',
    math: 'Math Builder',
    listening: 'Listening Builder',
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
    responseType: 'single_choice',
    skill: getSkills(section?.type)[0],
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
    order: (section?.questionsCount || 0) + 1,
    correctOption: 'A',
    acceptedAnswers: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: ''
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
      isCorrect: values.correctOption.trim().toUpperCase() === label,
      order: index + 1
    }))
    .filter((option) => option.text);
}

export default function AdminQuestionWorkspace({
  sections,
  passages,
  onCreatePassage,
  onCreateQuestion,
  onUploadImage
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];
  const form = useForm({ defaultValues: getDefaults(activeSection) });
  const values = useWatch({ control: form.control });
  const sectionType = activeSection?.type;
  const responseType = sectionType === 'reading_writing'
    ? 'single_choice'
    : sectionType === 'listening'
      ? 'single_choice'
      : values.responseType;
  const isTextResponse = responseType === 'text_input';
  const usesOptions = !isTextResponse;
  const skills = getSkills(sectionType);

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId('');
      setEditorOpen(false);
      return;
    }
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  useEffect(() => {
    if (activeSection && editorOpen) {
      form.reset(getDefaults(activeSection));
      setStatus(null);
    }
  }, [activeSection?.id]);

  function openEditor() {
    if (!activeSection) return;
    form.reset(getDefaults(activeSection));
    setStatus(null);
    setEditorOpen(true);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !onUploadImage) return;

    setImageUploading(true);
    setStatus({ type: 'pending', message: 'Uploading image...' });
    try {
      const url = await onUploadImage(file);
      form.setValue('imageUrl', url, { shouldDirty: true });
      setStatus({ type: 'success', message: 'Image uploaded and attached to this math question.' });
    } catch (error) {
      event.target.value = '';
      setStatus({ type: 'error', message: getApiErrorMessage(error, 'Image could not be uploaded.') });
    } finally {
      setImageUploading(false);
    }
  }

  const previewQuestion = useMemo(() => {
    const selectedPassage = passages.find((passage) => passage.id === values.passageId);
    const draftPassage = values.passageMode === 'existing'
      ? selectedPassage
      : {
          title: values.passageTitle || 'Untitled passage',
          category: values.passageCategory || 'reading',
          content: values.passageContent || 'Passage text will appear here in the student view.'
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
        : sectionType === 'listening'
          ? 'audio_question'
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
            content: submittedValues.passageContent.trim()
          });
          passageId = passage.id;
        }
      }

      await onCreateQuestion({
        sectionId: activeSection.id,
        passageId,
        type: sectionType === 'reading_writing'
          ? 'passage_question'
          : sectionType === 'listening'
            ? 'audio_question'
            : responseType,
        skill: submittedValues.skill,
        difficulty: submittedValues.difficulty,
        questionText: submittedValues.questionText.trim(),
        audioUrl: sectionType === 'listening' ? submittedValues.audioUrl || null : null,
        audioTitle: sectionType === 'listening' ? submittedValues.audioTitle || null : null,
        instructions: sectionType === 'listening' ? submittedValues.instructions || null : null,
        transcript: sectionType === 'listening' ? submittedValues.transcript || null : null,
        audioReplayLimit: sectionType === 'listening' && submittedValues.audioReplayLimit !== 'unlimited'
          ? Number(submittedValues.audioReplayLimit)
          : null,
        imageUrl: sectionType === 'math' ? submittedValues.imageUrl || null : null,
        formulaText: sectionType === 'math' ? submittedValues.formulaText || null : null,
        tableData: sectionType === 'math' ? tableData : null,
        calculatorAllowed: sectionType === 'math' && Boolean(submittedValues.calculatorAllowed),
        acceptedAnswers: isTextResponse ? acceptedAnswers : null,
        correctAnswer: isTextResponse ? { acceptedAnswers } : { value: correctLabel },
        explanation: submittedValues.explanation.trim(),
        order: Number(submittedValues.order),
        options: usesOptions ? options : []
      });
      setStatus({ type: 'success', message: 'Question saved. It is ready in the selected SAT module.' });
      form.reset({ ...getDefaults(activeSection), order: Number(submittedValues.order) + 1 });
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
        <div className="builder-section-list">
          {sections.map((section) => (
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
              <span>{section.type.replace('_', ' ')} / {section.duration} min</span>
              <small>{section.questionsCount} questions</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="builder-editor-stage">
        {!activeSection ? (
          <div className="builder-empty">
            <h3>No modules yet</h3>
            <p>Create an exam and add a Reading & Writing, Math, Listening, or Custom Practice module first.</p>
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
                  onSubmit={form.handleSubmit(handleSaveQuestion)}
                >
                  {sectionType === 'reading_writing' ? (
                    <ReadingFields form={form} values={values} passages={passages} />
                  ) : null}
                  {sectionType === 'math' ? (
                    <MathFields
                      form={form}
                      isTextResponse={isTextResponse}
                      imageUrl={values.imageUrl}
                      imageUploading={imageUploading}
                      onImageUpload={handleImageUpload}
                    />
                  ) : null}
                  {sectionType === 'listening' ? (
                    <ListeningFields form={form} />
                  ) : null}
                  {sectionType === 'custom_practice' ? (
                    <CustomFields form={form} isTextResponse={isTextResponse} />
                  ) : null}
                  <CommonAnswerFields
                    form={form}
                    skills={skills}
                    isTextResponse={isTextResponse}
                    usesOptions={usesOptions}
                  />
                  {status ? (
                    <p className={`support-status ${status.type === 'pending' ? '' : status.type}`}>
                      {status.message}
                    </p>
                  ) : null}
                  <div className="builder-save-actions">
                    <Button variant="ghost" onClick={() => setPreviewOpen(true)}>Preview student view</Button>
                    <Button type="submit" disabled={status?.type === 'pending' || imageUploading}>
                      {imageUploading ? 'Uploading image...' : status?.type === 'pending' ? 'Saving...' : 'Save Question'}
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

function ReadingFields({ form, values, passages }) {
  return (
    <div className="reading-editor-grid">
      <fieldset className="editor-panel passage-editor">
        <legend>Passage Editor</legend>
        <label className="form-field">
          <span>Passage source</span>
          <select {...form.register('passageMode')}>
            <option value="new">Write new passage</option>
            <option value="existing">Use saved passage</option>
          </select>
        </label>
        {values.passageMode === 'existing' ? (
          <label className="form-field">
            <span>Saved passage</span>
            <select {...form.register('passageId', { required: values.passageMode === 'existing' })}>
              <option value="">Choose passage</option>
              {passages.map((passage) => <option key={passage.id} value={passage.id}>{passage.title}</option>)}
            </select>
          </label>
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
              <textarea className="passage-author-text" {...form.register('passageContent', { required: true, minLength: 20 })} />
            </label>
          </>
        )}
      </fieldset>
      <QuestionPromptFields form={form} />
    </div>
  );
}

function MathFields({ form, isTextResponse, imageUrl, imageUploading, onImageUpload }) {
  return (
    <div className="math-editor-grid">
      <QuestionPromptFields form={form}>
        <label className="form-field">
          <span>Response type</span>
          <select {...form.register('responseType')}>
            <option value="single_choice">Multiple choice</option>
            <option value="text_input">Student-produced response</option>
          </select>
        </label>
      </QuestionPromptFields>
      <fieldset className="editor-panel reference-editor">
        <legend>Reference & Media</legend>
        <label className="form-field">
          <span>Formula / reference text</span>
          <textarea placeholder="Provide formulas shown with this item." {...form.register('formulaText')} />
        </label>
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

function ListeningFields({ form }) {
  return (
    <div className="listening-editor-grid">
      <fieldset className="editor-panel audio-editor">
        <legend>Audio Source</legend>
        <label className="form-field">
          <span>Audio title</span>
          <input {...form.register('audioTitle', { required: true, minLength: 2 })} />
        </label>
        <label className="form-field">
          <span>Audio upload / URL</span>
          <input placeholder="/uploads/audio/lesson.wav" {...form.register('audioUrl', { required: true })} />
        </label>
        <label className="form-field">
          <span>Instructions</span>
          <textarea {...form.register('instructions', { required: true, minLength: 3 })} />
        </label>
        <label className="form-field">
          <span>Transcript (hidden during exam)</span>
          <textarea {...form.register('transcript')} />
        </label>
        <label className="form-field">
          <span>Replay limit</span>
          <select {...form.register('audioReplayLimit')}>
            <option value="unlimited">Unlimited</option>
            <option value="1">Once</option>
            <option value="2">Twice</option>
          </select>
        </label>
      </fieldset>
      <QuestionPromptFields form={form} />
    </div>
  );
}

function CustomFields({ form }) {
  return (
    <div className="custom-editor-grid">
      <QuestionPromptFields form={form}>
        <label className="form-field">
          <span>Response type</span>
          <select {...form.register('responseType')}>
            <option value="single_choice">Multiple choice</option>
            <option value="text_input">Text input</option>
          </select>
        </label>
      </QuestionPromptFields>
    </div>
  );
}

function QuestionPromptFields({ form, children }) {
  return (
    <fieldset className="editor-panel question-editor">
      <legend>Question Editor</legend>
      {children}
      <label className="form-field">
        <span>Question text</span>
        <textarea className="question-author-text" {...form.register('questionText', { required: true, minLength: 3 })} />
      </label>
    </fieldset>
  );
}

function CommonAnswerFields({ form, skills, isTextResponse, usesOptions }) {
  return (
    <fieldset className="editor-panel answer-editor">
      <legend>Scoring & Answer Key</legend>
      <div className="answer-meta-grid">
        <label className="form-field">
          <span>Skill</span>
          <select {...form.register('skill')}>
            {skills.map((skill) => <option key={skill} value={skill}>{skill.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Difficulty</span>
          <select {...form.register('difficulty')}>
            <option value="EASY">EASY</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HARD">HARD</option>
          </select>
        </label>
        <label className="form-field">
          <span>Order</span>
          <input type="number" min="0" {...form.register('order', { required: true, min: 0 })} />
        </label>
      </div>
      {usesOptions ? (
        <>
          <div className="question-options-grid">
            {['A', 'B', 'C', 'D'].map((label) => (
              <label key={label} className="form-field">
                <span>Option {label}</span>
                <input {...form.register(`option${label}`, { required: true })} />
              </label>
            ))}
          </div>
          <label className="form-field compact-key-field">
            <span>Correct answer</span>
            <select {...form.register('correctOption')}>
              {['A', 'B', 'C', 'D'].map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
        </>
      ) : (
        <label className="form-field">
          <span>Accepted answers (comma separated)</span>
          <input placeholder="3, 3.0, 6/2" {...form.register('acceptedAnswers', { required: isTextResponse })} />
        </label>
      )}
      <label className="form-field">
        <span>Explanation</span>
        <textarea {...form.register('explanation', { required: true, minLength: 5 })} />
      </label>
    </fieldset>
  );
}
