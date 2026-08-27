import { Fragment, useEffect, useState } from "react";
import { ChevronDown, Eye, FileQuestion, FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import AdminLayout from "../layouts/AdminLayout.jsx";
import TeacherLayout from "../layouts/TeacherLayout.jsx";
import AdminExamBuilder from "../components/admin/AdminExamBuilder.jsx";
import AdminQuestionWorkspace from "../components/admin/AdminQuestionWorkspace.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import ConfirmActionModal from "../components/ui/ConfirmActionModal.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import RowActionMenu from "../components/ui/RowActionMenu.jsx";
import MathJaxContent, { stripRichTextMarkup } from "../components/math/MathJaxContent.jsx";
import RichMathEditor from "../components/math/RichMathEditor.jsx";
import QuestionWorkspaceErrorBoundary from "../components/admin/QuestionWorkspaceErrorBoundary.jsx";
import QuestionImage from "../components/exam/renderers/QuestionImage.jsx";
import PassageAssetViewer from "../components/exam/PassageAssetViewer.jsx";
import { getApiErrorMessage } from "../utils/apiError.js";
import "../styles/pages/teacher-exams.css";
import {
  createExam, createPassage, createQuestion, createSection, deleteExam, deleteQuestion,
  deleteSection, getExam, getExams, getPassages, updateExam, updateQuestion,
  updatePassage, updateSection, uploadPassageFile, uploadQuestionImage,
} from "../services/examService.js";
import { createQuestionBankItem } from "../services/questionBankService.js";

const sourceOptions = [
  { value: "MONOPREP", label: "MonoPrep Exam" },
  { value: "OFFICIAL", label: "Official Exam" },
];
const OPTION_LABELS = ["A", "B", "C", "D"];

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function questionCount(exam) {
  return (exam.sections || []).reduce((total, section) => total + (section.questionsCount || section.questions?.length || 0), 0);
}

function optionValues(question) {
  const options = new Map((question.options || []).map((option) => [option.label, option]));
  const correctValue = question.correctAnswer?.value
    ?? question.correctAnswer
    ?? (question.options || []).find((option) => option.isCorrect)?.label
    ?? "A";

  return {
    correctOption: String(correctValue).toUpperCase(),
    ...Object.fromEntries(OPTION_LABELS.map((label) => [`option${label}`, options.get(label)?.text || ""])),
    ...Object.fromEntries(OPTION_LABELS.map((label) => [`option${label}ImageUrl`, options.get(label)?.imageUrl || ""])),
  };
}

export default function AdminExamsPage({ mode = "admin" }) {
  const Layout = mode === "teacher" ? TeacherLayout : AdminLayout;
  const subtitle = mode === "teacher"
    ? "Create and maintain Free or Premium SAT exams from one focused catalog."
    : "Table-first exam publishing, modules, and question management.";
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [passages, setPassages] = useState([]);
  const [builderSignal, setBuilderSignal] = useState(0);
  const [expandedExamId, setExpandedExamId] = useState("");
  const [examDetails, setExamDetails] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [viewingExam, setViewingExam] = useState(null);
  const [viewingExamLoading, setViewingExamLoading] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [authoringSection, setAuthoringSection] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [editingImageField, setEditingImageField] = useState("");
  const [editingPassageFile, setEditingPassageFile] = useState(false);

  const sectionForm = useForm({ defaultValues: { title: "", type: "reading_writing", duration: 30, order: 1 } });
  const examForm = useForm({
    defaultValues: {
      title: "", description: "", type: "FULL_LENGTH", accessType: "FREE", source: "MONOPREP",
      contentMode: "REAL_EXAM", competitionKind: "NONE", competitionStartsAt: "",
      competitionEndsAt: "", totalDuration: 87, isPublished: "false",
    },
  });
  const questionForm = useForm({
    defaultValues: {
      questionText: "", formulaText: "", skill: "", difficulty: "MEDIUM", explanation: "", explanationImageUrl: "", order: 1,
      imageUrl: "", acceptedAnswers: "", hasAnswerChoices: true,
      passageTitle: "", passageCategory: "reading", passageContent: "", passageAttachmentUrl: "",
      passageAttachmentName: "", passageAttachmentMimeType: "",
      correctOption: "A", optionA: "", optionAImageUrl: "", optionB: "", optionBImageUrl: "",
      optionC: "", optionCImageUrl: "", optionD: "", optionDImageUrl: "",
    },
  });
  const questionHasAnswerChoices = questionForm.watch("hasAnswerChoices");

  useEffect(() => {
    if (questionHasAnswerChoices === false) {
      OPTION_LABELS.flatMap((label) => [`option${label}`, `option${label}ImageUrl`]).forEach((name) => {
        questionForm.unregister(name, { keepValue: true, keepDefaultValue: true });
      });
      questionForm.clearErrors([...OPTION_LABELS.map((label) => `option${label}`), "correctOption"]);
      return;
    }

    questionForm.unregister("acceptedAnswers", { keepValue: true, keepDefaultValue: true });
    questionForm.clearErrors("acceptedAnswers");
  }, [questionForm, questionHasAnswerChoices]);

  async function load() {
    const [examRows, passageRows] = await Promise.all([getExams(), getPassages()]);
    setExams(examRows);
    setPassages(passageRows);
    if (expandedExamId) {
      const detail = await getExam(expandedExamId).catch(() => null);
      if (detail) setExamDetails((current) => ({ ...current, [expandedExamId]: detail }));
    }
  }

  useEffect(() => {
    load().catch(() => { setExams([]); setPassages([]); }).finally(() => setLoading(false));
  }, []);

  async function toggleExam(examId) {
    if (expandedExamId === examId) {
      setExpandedExamId("");
      return;
    }
    setExpandedExamId(examId);
    if (examDetails[examId]) return;
    setDetailLoadingId(examId);
    try {
      const detail = await getExam(examId);
      setExamDetails((current) => ({ ...current, [examId]: detail }));
    } finally {
      setDetailLoadingId("");
    }
  }

  function openExamEditor(exam) {
    setEditingExam(exam);
    setActionStatus(null);
    examForm.reset({
      title: exam.title,
      description: exam.description,
      type: exam.type,
      accessType: exam.accessType,
      source: exam.source || "MONOPREP",
      contentMode: exam.contentMode || "REAL_EXAM",
      competitionKind: exam.competitionKind || "NONE",
      competitionStartsAt: toDateTimeLocal(exam.competitionStartsAt),
      competitionEndsAt: toDateTimeLocal(exam.competitionEndsAt),
      totalDuration: exam.totalDuration || 87,
      isPublished: String(exam.isPublished),
    });
  }

  function openSectionEditor(section) {
    setEditingSection(section);
    setActionStatus(null);
    sectionForm.reset({ title: section.title, type: section.type, duration: section.duration, order: section.order });
  }

  function openQuestionEditor(question, sectionType) {
    setEditingQuestion({ ...question, sectionType });
    setActionStatus(null);
    questionForm.reset({
      questionText: question.questionText,
      formulaText: question.formulaText || "",
      skill: question.skill,
      difficulty: question.difficulty,
      explanation: question.explanation,
      explanationImageUrl: question.explanationImageUrl || "",
      imageUrl: question.imageUrl || "",
      acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.join(", ") : "",
      hasAnswerChoices: question.type !== "text_input",
      passageTitle: question.passage?.title || "",
      passageCategory: question.passage?.category || "reading",
      passageContent: question.passage?.content || "",
      passageAttachmentUrl: question.passage?.attachmentUrl || "",
      passageAttachmentName: question.passage?.attachmentName || "",
      passageAttachmentMimeType: question.passage?.attachmentMimeType || "",
      order: question.order,
      ...optionValues(question),
    });
  }

  async function openExamViewer(exam) {
    setViewingExamLoading(true);
    setViewingExam(exam);
    try {
      const detail = examDetails[exam.id] || await getExam(exam.id);
      setViewingExam(detail);
      setExamDetails((current) => ({ ...current, [exam.id]: detail }));
    } catch (error) {
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Exam details could not be loaded.") });
    } finally {
      setViewingExamLoading(false);
    }
  }

  async function handleExamUpdate(values) {
    setActionStatus({ type: "pending", message: "Saving exam..." });
    try {
      await updateExam(editingExam.id, {
        title: values.title.trim(),
        description: values.description.trim(),
        type: values.contentMode === "QUESTION_HUB" ? "CUSTOM" : values.type,
        accessType: values.contentMode === "QUESTION_HUB" ? "FREE" : values.accessType,
        source: values.contentMode === "QUESTION_HUB" ? "MONOPREP" : values.source,
        contentMode: values.contentMode,
        competitionKind: values.contentMode === "REAL_EXAM" ? values.competitionKind : "NONE",
        competitionStartsAt: values.contentMode === "REAL_EXAM" && values.competitionKind !== "NONE" ? new Date(values.competitionStartsAt).toISOString() : null,
        competitionEndsAt: values.contentMode === "REAL_EXAM" && values.competitionKind !== "NONE" ? new Date(values.competitionEndsAt).toISOString() : null,
        referenceText: null,
        totalDuration: values.contentMode === "QUESTION_HUB" ? 1 : Number(values.totalDuration),
        isPublished: values.isPublished === "true",
      });
      await load();
      setEditingExam(null);
    } catch (error) {
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Exam could not be updated.") });
    }
  }

  async function handleSectionUpdate(values) {
    setActionStatus({ type: "pending", message: "Saving module..." });
    try {
      await updateSection(editingSection.id, { title: values.title.trim(), type: values.type, duration: Number(values.duration), order: Number(values.order) });
      await load();
      setEditingSection(null);
    } catch (error) {
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Module could not be updated.") });
    }
  }

  async function handleQuestionUpdate(values) {
    setActionStatus({ type: "pending", message: "Saving question..." });
    try {
      const payload = {
        questionText: values.questionText.trim(),
        formulaText: values.formulaText.trim() || null,
        skill: values.skill.trim(),
        difficulty: values.difficulty,
        explanation: values.explanation.trim(),
        explanationImageUrl: values.explanationImageUrl || null,
        imageUrl: values.imageUrl || null,
        order: Number(values.order),
      };

      if (editingQuestion.sectionType === "reading_writing") {
        const passagePayload = {
          title: values.passageTitle.trim() || "Untitled passage",
          category: values.passageCategory.trim() || "reading",
          content: values.passageContent.trim(),
          attachmentUrl: values.passageAttachmentUrl || null,
          attachmentName: values.passageAttachmentName || null,
          attachmentMimeType: values.passageAttachmentMimeType || null,
        };
        const updatedPassage = editingQuestion.passage
          ? await updatePassage(editingQuestion.passage.id, passagePayload)
          : await createPassage(passagePayload);
        payload.passageId = updatedPassage.id;
      }

      if (values.hasAnswerChoices) {
        payload.type = editingQuestion.sectionType === "reading_writing" ? "passage_question" : "single_choice";
        payload.correctAnswer = { value: values.correctOption };
        payload.options = OPTION_LABELS.map((label, index) => ({
          label,
          text: values[`option${label}`].trim(),
          imageUrl: values[`option${label}ImageUrl`] || null,
          isCorrect: values.correctOption === label,
          order: index + 1,
        }));
        payload.acceptedAnswers = null;
      } else {
        const acceptedAnswers = values.acceptedAnswers.split(",").map((value) => value.trim()).filter(Boolean);
        if (!acceptedAnswers.length) throw new Error("Enter at least one accepted answer.");
        payload.type = "text_input";
        payload.options = [];
        payload.acceptedAnswers = acceptedAnswers;
        payload.correctAnswer = { acceptedAnswers };
      }

      await updateQuestion(editingQuestion.id, payload);
      await load();
      setEditingQuestion(null);
    } catch (error) {
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Question could not be updated.") });
    }
  }

  async function handleQuestionEditorImageUpload(event, fieldName) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditingImageField(fieldName);
    setActionStatus({ type: "pending", message: "Uploading image..." });
    try {
      const url = await uploadQuestionImage(file);
      questionForm.setValue(fieldName, url, { shouldDirty: true });
      setActionStatus(null);
    } catch (error) {
      event.target.value = "";
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Image could not be uploaded.") });
    } finally {
      setEditingImageField("");
    }
  }

  async function handleEditingPassageFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setEditingPassageFile(true);
    setActionStatus({ type: "pending", message: "Uploading passage material..." });
    try {
      const uploaded = await uploadPassageFile(file);
      questionForm.setValue("passageAttachmentUrl", uploaded.url, { shouldDirty: true });
      questionForm.setValue("passageAttachmentName", uploaded.name, { shouldDirty: true });
      questionForm.setValue("passageAttachmentMimeType", uploaded.mimeType, { shouldDirty: true });
      setActionStatus(null);
    } catch (error) {
      setActionStatus({ type: "error", message: getApiErrorMessage(error, "Passage material could not be uploaded.") });
    } finally {
      event.target.value = "";
      setEditingPassageFile(false);
    }
  }

  async function runConfirmAction() {
    if (!confirmAction) return;
    setConfirmPending(true);
    try {
      await confirmAction.run();
      await load();
      setConfirmAction(null);
    } finally {
      setConfirmPending(false);
    }
  }

  if (loading) {
    return <Layout title="Exams" subtitle={subtitle}><Loader label="Loading exams..." /></Layout>;
  }

  return (
    <Layout title="Exams" subtitle={subtitle} actions={<Button onClick={() => setBuilderSignal((value) => value + 1)}><Plus aria-hidden="true" /> Create exam</Button>}>
      <div className={mode === "teacher" ? "teacher-exam-workspace" : "admin-exam-workspace"}>
        <AdminExamBuilder
          exams={exams}
          passages={passages}
          openSignal={builderSignal}
          hideTrigger
          onCreateExam={async (payload) => { const exam = await createExam(payload); await load(); return exam; }}
          onCreateSection={async (payload) => { const section = await createSection(payload); await load(); return section; }}
          onCreatePassage={async (payload) => { const passage = await createPassage(payload); await load(); return passage; }}
          onCreateQuestion={async (payload) => { const question = await createQuestion(payload); await load(); return question; }}
          onCreateQuestionHubItem={createQuestionBankItem}
          onUploadImage={uploadQuestionImage}
          onUploadPassageFile={uploadPassageFile}
        />

        <Card title="Exam catalog" className="crm-table-card exam-catalog-card">
          {exams.length ? (
            <div className="table-wrap">
              <table className="data-table crm-data-table exam-catalog-table">
                <thead><tr><th>Exam</th><th>Source</th><th>Format</th><th>Access</th><th>Content</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {exams.map((exam) => {
                    const expanded = expandedExamId === exam.id;
                    const detail = examDetails[exam.id];
                    return (
                      <Fragment key={exam.id}>
                        <tr className={expanded ? "expanded-row" : ""}>
                          <td data-label="Exam"><button type="button" className="crm-expand-button" onClick={() => toggleExam(exam.id)} aria-expanded={expanded}><ChevronDown aria-hidden="true" /><span><strong>{exam.title}</strong><small>{exam.description}</small></span></button></td>
                          <td data-label="Source"><span className={`table-status source-${(exam.source || "MONOPREP").toLowerCase()}`}>{exam.source === "OFFICIAL" ? "Official" : "MonoPrep"}</span></td>
                          <td data-label="Format"><strong className="table-compact-value">{exam.type.replaceAll("_", " ")}</strong><small>{exam.contentMode === "QUESTION_HUB" ? "Question Hub" : "Real Exam"}</small></td>
                          <td data-label="Access"><span className={`access-badge ${exam.accessType === "PAID" ? "premium" : "free"}`}>{exam.accessType === "PAID" ? "Premium" : "Free"}</span></td>
                          <td data-label="Content">{exam.sections.length} modules · {questionCount(exam)} questions</td>
                          <td data-label="Status"><span className={`table-status ${exam.isPublished ? "approved" : "pending"}`}>{exam.isPublished ? "Published" : "Draft"}</span></td>
                          <td className="table-actions"><RowActionMenu label={`Actions for ${exam.title}`} items={[
                            { label: "View", icon: Eye, onSelect: () => openExamViewer(exam) },
                            { label: "Edit", icon: Pencil, onSelect: () => openExamEditor(exam) },
                            { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => setConfirmAction({ title: "Delete exam?", message: `"${exam.title}" and all modules, questions, and attempts will be removed.`, confirmLabel: "Delete exam", run: () => deleteExam(exam.id) }) },
                          ]} /></td>
                        </tr>
                        {expanded ? (
                          <tr className="exam-detail-row"><td colSpan="7">
                            {detailLoadingId === exam.id ? <Loader label="Loading exam questions..." /> : (
                              <div className="exam-inline-editor">
                                {(detail?.sections || []).map((section) => (
                                  <section key={section.id} className="exam-inline-section">
                                    <header><div><strong>{section.title}</strong><span>{section.type.replaceAll("_", " ")} · {section.duration} min · {section.questions.length} questions</span></div><RowActionMenu label={`Actions for ${section.title}`} items={[
                                      { label: "Add question", icon: Plus, onSelect: () => setAuthoringSection({ ...section, examId: exam.id, examTitle: exam.title, questionsCount: section.questions.length, contentMode: exam.contentMode }) },
                                      { label: "Edit module", icon: Pencil, onSelect: () => openSectionEditor(section) },
                                      { label: "Delete module", icon: Trash2, tone: "danger", onSelect: () => setConfirmAction({ title: "Delete module?", message: `"${section.title}" and all questions inside it will be removed.`, confirmLabel: "Delete module", run: () => deleteSection(section.id) }) },
                                    ]} /></header>
                                    {section.questions.length ? (
                                      <div className="table-wrap"><table className="data-table nested-question-table"><thead><tr><th>#</th><th>Question</th><th>Skill</th><th>Difficulty</th><th aria-label="Actions" /></tr></thead><tbody>
                                        {section.questions.map((question) => <tr key={question.id}><td>{question.order}</td><td><strong>{stripRichTextMarkup(question.questionText)}</strong><small>{question.type.replaceAll("_", " ")}</small></td><td>{question.skill.replaceAll("_", " ")}</td><td><span className={`table-status difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span></td><td className="table-actions"><RowActionMenu label="Question actions" items={[
                                          { label: "View", icon: Eye, onSelect: () => setViewingQuestion(question) },
                                          { label: "Edit", icon: Pencil, onSelect: () => openQuestionEditor(question, section.type) },
                                          { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => setConfirmAction({ title: "Delete question?", message: "The question, options, and saved answers for it will be removed.", confirmLabel: "Delete question", run: () => deleteQuestion(question.id) }) },
                                        ]} /></td></tr>)}
                                      </tbody></table></div>
                                    ) : <div className="inline-empty"><FileQuestion aria-hidden="true" /> No questions in this module yet.</div>}
                                  </section>
                                ))}
                                {!detail?.sections?.length ? <div className="inline-empty"><FileQuestion aria-hidden="true" /> No modules in this exam yet.</div> : null}
                              </div>
                            )}
                          </td></tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={FileQuestion} title="No exams created" message="Create the first MonoPrep or Official exam." actionLabel="Create exam" actionOnClick={() => setBuilderSignal((value) => value + 1)} />}
        </Card>
      </div>

      <Modal open={Boolean(viewingExam)} title="Exam details" className="modal-card-wide exam-content-view-modal" onClose={() => setViewingExam(null)} actions={<Button variant="ghost" onClick={() => setViewingExam(null)}>Close</Button>}>
        {viewingExamLoading ? <Loader label="Loading complete exam content..." /> : viewingExam ? (
          <div className="exam-content-view">
            <div className="exam-detail-grid"><div><span>Title</span><b>{viewingExam.title}</b></div><div><span>Source</span><b>{viewingExam.source || "MONOPREP"}</b></div><div><span>Access</span><b>{viewingExam.accessType}</b></div><div><span>Status</span><b>{viewingExam.isPublished ? "Published" : "Draft"}</b></div><div><span>Mode</span><b>{viewingExam.contentMode}</b></div><div><span>Duration</span><b>{viewingExam.totalDuration} minutes</b></div><p>{viewingExam.description}</p></div>
            <div className="exam-content-sections">
              {(viewingExam.sections || []).map((section) => (
                <section key={section.id} className="exam-content-section">
                  <header><div><span>{section.type.replaceAll("_", " ")}</span><h3>{section.title}</h3></div><b>{section.questions?.length || 0} questions</b></header>
                  <div className="exam-content-question-list">
                    {(section.questions || []).map((question) => (
                      <AdminQuestionPreview key={question.id} question={question} compact />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(viewingQuestion)} title="Question details" className="modal-card-wide" onClose={() => setViewingQuestion(null)} actions={<Button variant="ghost" onClick={() => setViewingQuestion(null)}>Close</Button>}>
        {viewingQuestion ? (
          <AdminQuestionPreview question={viewingQuestion} />
        ) : null}
      </Modal>

      <Modal open={Boolean(authoringSection)} title="Add question" className="modal-card-wide question-authoring-modal" onClose={() => setAuthoringSection(null)} actions={<Button variant="ghost" onClick={() => setAuthoringSection(null)}>Close</Button>}>
        {authoringSection ? (
          <QuestionWorkspaceErrorBoundary resetKey={authoringSection.id}>
            <AdminQuestionWorkspace
              sections={[authoringSection]}
              passages={passages}
              onCreatePassage={async (payload) => { const passage = await createPassage(payload); await load(); return passage; }}
              onCreateQuestion={async (payload) => { const question = await createQuestion(payload); await load(); setAuthoringSection((current) => current ? { ...current, questionsCount: (current.questionsCount || 0) + 1 } : current); return question; }}
              onCreateQuestionHubItem={createQuestionBankItem}
              onUploadImage={uploadQuestionImage}
              onUploadPassageFile={uploadPassageFile}
            />
          </QuestionWorkspaceErrorBoundary>
        ) : null}
      </Modal>

      <Modal open={Boolean(editingExam)} title="Edit exam" className="modal-card-wide crm-form-modal" onClose={() => setEditingExam(null)} actions={<><Button variant="ghost" onClick={() => setEditingExam(null)}>Cancel</Button><Button type="submit" form="exam-edit-form" disabled={actionStatus?.type === "pending"}>Save exam</Button></>}>
        <form id="exam-edit-form" className="stack-form" onSubmit={examForm.handleSubmit(handleExamUpdate)}>
          <div className="crm-form-row"><label className="form-field"><span>Title</span><input {...examForm.register("title", { required: true, minLength: 3 })} /></label>{examForm.watch("contentMode") === "REAL_EXAM" ? <label className="form-field"><span>Total minutes</span><input type="number" min="1" {...examForm.register("totalDuration", { required: true, min: 1 })} /></label> : null}</div>
          <label className="form-field"><span>Description</span><textarea {...examForm.register("description", { required: true, minLength: 10 })} /></label>
          {examForm.watch("contentMode") === "REAL_EXAM" ? <><div className="crm-form-row crm-form-row-three"><div className="form-field"><span>Source</span><PremiumSelect ariaLabel="Exam source" value={examForm.watch("source")} onChange={(value) => examForm.setValue("source", value)} options={sourceOptions} /></div><div className="form-field"><span>Type</span><PremiumSelect ariaLabel="Exam type" value={examForm.watch("type")} onChange={(value) => examForm.setValue("type", value)} options={[{ value: "FULL_LENGTH", label: "Full Length SAT" }, { value: "PRACTICE", label: "Practice Exam" }, { value: "CUSTOM", label: "Custom Practice" }]} /></div><div className="form-field"><span>Access</span><PremiumSelect ariaLabel="Exam access" value={examForm.watch("accessType")} onChange={(value) => examForm.setValue("accessType", value)} options={[{ value: "FREE", label: "Free" }, { value: "PAID", label: "Premium" }]} /></div></div><p className="builder-default-note">The official MonoPrep SAT Math reference sheet is included automatically in every Math module.</p><div className="form-field"><span>Competition</span><PremiumSelect ariaLabel="Competition" value={examForm.watch("competitionKind")} onChange={(value) => examForm.setValue("competitionKind", value)} options={[{ value: "NONE", label: "Regular practice exam" }, { value: "FULL", label: "Monthly full competition" }, { value: "MATH", label: "Biweekly math competition" }, { value: "ENGLISH", label: "Biweekly English competition" }]} /></div>{examForm.watch("competitionKind") !== "NONE" ? <div className="crm-form-row"><label className="form-field"><span>Starts at</span><input type="datetime-local" required {...examForm.register("competitionStartsAt")} /></label><label className="form-field"><span>Ends at</span><input type="datetime-local" required {...examForm.register("competitionEndsAt")} /></label></div> : null}</> : <p className="builder-default-note">Question Hub content remains free and does not use exam source, access, modules, or competition scheduling.</p>}
          <div className="form-field"><span>Status</span><PremiumSelect ariaLabel="Exam status" value={examForm.watch("isPublished")} onChange={(value) => examForm.setValue("isPublished", value)} options={[{ value: "false", label: "Draft" }, { value: "true", label: "Published" }]} /></div>
          {actionStatus?.type === "error" ? <p className="support-status error">{actionStatus.message}</p> : null}
        </form>
      </Modal>

      <Modal open={Boolean(editingSection)} title="Edit module" onClose={() => setEditingSection(null)} actions={<><Button variant="ghost" onClick={() => setEditingSection(null)}>Cancel</Button><Button type="submit" form="section-edit-form" disabled={actionStatus?.type === "pending"}>Save module</Button></>}>
        <form id="section-edit-form" className="stack-form" onSubmit={sectionForm.handleSubmit(handleSectionUpdate)}><label className="form-field"><span>Title</span><input {...sectionForm.register("title", { required: true, minLength: 2 })} /></label><div className="form-field"><span>Type</span><PremiumSelect ariaLabel="Module type" value={sectionForm.watch("type")} onChange={(value) => sectionForm.setValue("type", value)} options={[{ value: "reading_writing", label: "Reading & Writing" }, { value: "math", label: "Math" }, { value: "custom_practice", label: "Custom Practice" }]} /></div><div className="crm-form-row"><label className="form-field"><span>Duration</span><input type="number" min="1" {...sectionForm.register("duration", { required: true, min: 1 })} /></label><label className="form-field"><span>Order</span><input type="number" min="0" {...sectionForm.register("order", { required: true, min: 0 })} /></label></div>{actionStatus?.type === "error" ? <p className="support-status error">{actionStatus.message}</p> : null}</form>
      </Modal>

      <Modal open={Boolean(editingQuestion)} title="Edit question" className="modal-card-wide" onClose={() => setEditingQuestion(null)} actions={<><Button variant="ghost" onClick={() => setEditingQuestion(null)}>Cancel</Button><Button type="submit" form="question-edit-form" disabled={actionStatus?.type === "pending" || Boolean(editingImageField) || editingPassageFile}>Save question</Button></>}>
        <form id="question-edit-form" className="stack-form" onSubmit={questionForm.handleSubmit(handleQuestionUpdate)}>
          {editingQuestion?.sectionType === "reading_writing" ? (
            <fieldset className="editor-panel passage-editor question-edit-passage">
              <legend>Passage & material</legend>
              <div className="crm-form-row">
                <label className="form-field"><span>Passage title (optional)</span><input placeholder="Untitled passage" {...questionForm.register("passageTitle")} /></label>
                <label className="form-field"><span>Category</span><input {...questionForm.register("passageCategory", { required: true, minLength: 2 })} /></label>
              </div>
              <div className="form-field">
                <span>Passage material</span>
                <label className="passage-file-picker">
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif" disabled={editingPassageFile} onChange={handleEditingPassageFileUpload} />
                  <Upload aria-hidden="true" />
                  <span><b>{editingPassageFile ? "Uploading material..." : "Choose PDF, Word, or image"}</b><small>Replaces the passage material shown to students</small></span>
                </label>
                {questionForm.watch("passageAttachmentUrl") ? <><div className="passage-file-chip"><FileText aria-hidden="true" /><span>{questionForm.watch("passageAttachmentName") || "Attached material"}</span><button type="button" aria-label="Remove passage material" onClick={() => { questionForm.setValue("passageAttachmentUrl", "", { shouldDirty: true }); questionForm.setValue("passageAttachmentName", "", { shouldDirty: true }); questionForm.setValue("passageAttachmentMimeType", "", { shouldDirty: true }); }}><X aria-hidden="true" /></button></div><PassageAssetViewer compact passage={{ attachmentUrl: questionForm.watch("passageAttachmentUrl"), attachmentName: questionForm.watch("passageAttachmentName"), attachmentMimeType: questionForm.watch("passageAttachmentMimeType") }} /></> : null}
              </div>
              <RichMathEditor form={questionForm} name="passageContent" label="Passage content" className="passage-author-text" placeholder="Write or edit the passage text." showMathTemplates={false} />
            </fieldset>
          ) : null}
          <QuestionEditorImageField form={questionForm} fieldName="imageUrl" label="Question image" alt="Question image preview" uploadingImageField={editingImageField} onImageUpload={handleQuestionEditorImageUpload} />
          <RichMathEditor form={questionForm} name="questionText" label="Question text" className="question-author-text" placeholder={'Write text and formulas, for example: \\(f(x)=a^x+b\\)'} rules={{ required: true, minLength: 3 }} showMathTemplates />
          {editingQuestion?.sectionType === "math" ? <p className="builder-default-note">Insert formulas directly in the question text. Students always receive the built-in SAT Math reference sheet.</p> : null}
          <label className="question-answer-mode-toggle"><input type="checkbox" {...questionForm.register("hasAnswerChoices")} /><span aria-hidden="true" /><div><b>Multiple-choice answers</b><small>Turn off for a typed student response.</small></div></label>
          {questionForm.watch("hasAnswerChoices") ? (
            <AnswerOptionEditors
              form={questionForm}
              uploadingImageField={editingImageField}
              onImageUpload={handleQuestionEditorImageUpload}
              mathEnabled={editingQuestion?.sectionType === "math"}
            />
          ) : <label className="form-field"><span>Accepted answers (comma separated)</span><input placeholder="3, 3.0, 6/2" {...questionForm.register("acceptedAnswers", { required: true })} /></label>}
          <div className="crm-form-row crm-form-row-three"><label className="form-field"><span>Skill</span><input {...questionForm.register("skill", { required: true, minLength: 2 })} /></label><div className="form-field"><span>Difficulty</span><PremiumSelect ariaLabel="Difficulty" value={questionForm.watch("difficulty")} onChange={(value) => questionForm.setValue("difficulty", value)} options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]} /></div><label className="form-field"><span>Order</span><input type="number" min="0" {...questionForm.register("order", { required: true, min: 0 })} /></label></div>
          <RichMathEditor
            form={questionForm}
            name="explanation"
            label="Explanation / worked solution"
            className="explanation-rich-math-editor"
            placeholder="Explain each step and include formulas where needed."
            rules={{ required: true, minLength: 5 }}
            showMathTemplates={editingQuestion?.sectionType === "math"}
          />
          <QuestionEditorImageField
            form={questionForm}
            fieldName="explanationImageUrl"
            label="Explanation image"
            alt="Explanation image preview"
            uploadingImageField={editingImageField}
            onImageUpload={handleQuestionEditorImageUpload}
          />
          {actionStatus?.type === "error" ? <p className="support-status error">{actionStatus.message}</p> : null}
        </form>
      </Modal>

      <ConfirmActionModal open={Boolean(confirmAction)} title={confirmAction?.title} message={confirmAction?.message} confirmLabel={confirmAction?.confirmLabel} pending={confirmPending} onCancel={() => setConfirmAction(null)} onConfirm={runConfirmAction} />
    </Layout>
  );
}

function AdminQuestionPreview({ question, compact = false }) {
  const correctValue = question.correctAnswer?.value
    ?? question.correctAnswer
    ?? (question.options || []).find((option) => option.isCorrect)?.label;
  const acceptedAnswers = Array.isArray(question.acceptedAnswers)
    ? question.acceptedAnswers
    : question.correctAnswer?.acceptedAnswers || [];

  return (
    <article className={`question-preview admin-question-preview ${compact ? "compact" : ""}`.trim()}>
      <div className="preview-pills"><span className="pill">Question {question.order}</span><span className="pill">{question.skill}</span><span className="pill">{question.difficulty}</span></div>
      {question.passage ? (
        <section className="admin-question-passage">
          <header><span>{question.passage.category || "Reading"}</span><h4>{question.passage.title || "Passage"}</h4></header>
          <PassageAssetViewer passage={question.passage} compact={compact} />
          {question.passage.content ? <MathJaxContent block>{question.passage.content}</MathJaxContent> : null}
        </section>
      ) : null}
      {question.imageUrl ? <QuestionImage src={question.imageUrl} alt="Question material" /> : null}
      {question.formulaText ? <MathJaxContent block className="preview-formula">{question.formulaText}</MathJaxContent> : null}
      <MathJaxContent block className="preview-question">{question.questionText}</MathJaxContent>
      {(question.options || []).length ? (
        <div className="preview-options">
          {question.options.map((option) => {
            const correct = option.isCorrect || String(correctValue).toUpperCase() === option.label;
            return (
              <div key={option.id || option.label} className={`preview-option ${correct ? "correct" : ""}`.trim()}>
                <p><strong>{option.label}.</strong> <MathJaxContent>{option.text}</MathJaxContent></p>
                {option.imageUrl ? <QuestionImage src={option.imageUrl} alt={`Option ${option.label}`} /> : null}
              </div>
            );
          })}
        </div>
      ) : acceptedAnswers.length ? <p className="preview-accepted-answers"><strong>Accepted answers:</strong> {acceptedAnswers.join(", ")}</p> : null}
      <div className="preview-explanation">
        <strong>Explanation</strong>
        <MathJaxContent block>{question.explanation}</MathJaxContent>
        {question.explanationImageUrl ? <QuestionImage src={question.explanationImageUrl} alt="Worked solution" /> : null}
      </div>
    </article>
  );
}

function AnswerOptionEditors({ form, uploadingImageField, onImageUpload, mathEnabled }) {
  const correctOption = form.watch("correctOption");

  return (
    <fieldset className="editor-panel answer-editor math-option-editors">
      <legend>Answer choices</legend>
      <div className={`question-options-grid ${mathEnabled ? "with-math-options" : ""}`.trim()}>
        {OPTION_LABELS.map((label) => {
          const selected = correctOption === label;
          const imageField = `option${label}ImageUrl`;
          return (
            <div key={label} className={`option-author-block ${mathEnabled ? "option-author-math" : "option-author-compact"} ${selected ? "correct" : ""}`.trim()}>
              <div className="option-author-heading">
                <span>Option {label}</span>
                <button type="button" className={selected ? "selected" : ""} onClick={() => form.setValue("correctOption", label, { shouldDirty: true })}>
                  {selected ? "Correct answer" : "Mark correct"}
                </button>
              </div>
              <RichMathEditor
                form={form}
                name={`option${label}`}
                label={`Answer ${label}`}
                className="option-rich-math-editor"
                placeholder={`Write answer ${label} with text or formulas.`}
                rules={{ required: true }}
                showMathTemplates={mathEnabled}
              />
              <QuestionEditorImageField
                form={form}
                fieldName={imageField}
                label={`Option ${label} image`}
                alt={`Option ${label} image preview`}
                uploadingImageField={uploadingImageField}
                onImageUpload={onImageUpload}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function QuestionEditorImageField({ form, fieldName, label, alt, uploadingImageField, onImageUpload }) {
  const imageUrl = form.watch(fieldName) || "";
  const uploading = uploadingImageField === fieldName;

  return (
    <div className="question-image-file-field">
      <label className="form-field media-upload-field">
        <span>{label}</span>
        <input
          key={imageUrl || `${fieldName}-empty`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploading}
          onChange={(event) => onImageUpload(event, fieldName)}
        />
        <small>{uploading ? "Uploading image..." : "Choose PNG, JPG, WEBP, or GIF from this device."}</small>
      </label>
      {imageUrl ? (
        <div className="builder-image-preview">
          <QuestionImage src={imageUrl} alt={alt} />
          <Button type="button" variant="ghost" onClick={() => form.setValue(fieldName, "", { shouldDirty: true })}>
            Remove image
          </Button>
        </div>
      ) : null}
    </div>
  );
}
