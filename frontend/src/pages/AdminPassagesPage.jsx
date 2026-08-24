import { useEffect, useState } from "react";
import { BookOpen, Eye, FileText, Paperclip, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import AdminLayout from "../layouts/AdminLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import ConfirmActionModal from "../components/ui/ConfirmActionModal.jsx";
import RowActionMenu from "../components/ui/RowActionMenu.jsx";
import PassageAssetViewer from "../components/exam/PassageAssetViewer.jsx";
import {
  createPassage,
  deletePassage,
  getPassages,
  updatePassage,
  uploadPassageFile,
} from "../services/examService.js";
import { getApiErrorMessage } from "../utils/apiError.js";

const defaults = { title: "", category: "reading", content: "" };

function wordCount(content = "") {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

export default function AdminPassagesPage() {
  const [loading, setLoading] = useState(true);
  const [passages, setPassages] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [status, setStatus] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm({ defaultValues: defaults });

  async function load() {
    setPassages(await getPassages());
  }

  useEffect(() => {
    load().catch(() => setPassages([])).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    form.reset(defaults);
    setAttachment(null);
    setStatus(null);
    setDialog({ mode: "create" });
  }

  function openEdit(passage) {
    form.reset({ title: passage.title, category: passage.category, content: passage.content });
    setAttachment(passage.attachmentUrl ? {
      url: passage.attachmentUrl,
      name: passage.attachmentName,
      mimeType: passage.attachmentMimeType,
    } : null);
    setStatus(null);
    setDialog({ mode: "edit", passage });
  }

  async function handleSave(values) {
    const payload = {
      title: values.title.trim(),
      category: values.category.trim(),
      content: values.content.trim(),
      attachmentUrl: attachment?.url || null,
      attachmentName: attachment?.name || null,
      attachmentMimeType: attachment?.mimeType || null,
    };
    if (payload.content.length < 20 && !payload.attachmentUrl) {
      setStatus({ type: "error", message: "Write at least 20 characters or attach a PDF, Word, or image file." });
      return;
    }
    setStatus({ type: "pending", message: "Saving passage..." });
    try {
      if (dialog.mode === "edit") await updatePassage(dialog.passage.id, payload);
      else await createPassage(payload);
      await load();
      setDialog(null);
      setStatus(null);
    } catch (error) {
      setStatus({ type: "error", message: getApiErrorMessage(error, "Passage could not be saved.") });
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setUploading(true);
    setStatus({ type: "pending", message: "Uploading passage material..." });
    try {
      const uploaded = await uploadPassageFile(file);
      setAttachment(uploaded);
      setStatus(null);
    } catch (error) {
      setStatus({ type: "error", message: getApiErrorMessage(error, "Passage material could not be uploaded.") });
    } finally {
      setUploading(false);
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
    return <AdminLayout title="Passages" subtitle="Manage passage and stimulus content."><Loader label="Loading passages..." /></AdminLayout>;
  }

  return (
    <AdminLayout
      title="Passages"
      subtitle="A compact library for reading stimuli used across MonoPrep exams."
      actions={<Button onClick={openCreate}><Plus aria-hidden="true" /> Add passage</Button>}
    >
      <Card title="Passage library" className="crm-table-card">
        {passages.length ? (
          <div className="table-wrap">
            <table className="data-table crm-data-table">
              <thead><tr><th>Passage</th><th>Category</th><th>File</th><th>Words</th><th>Updated</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {passages.map((passage) => (
                  <tr key={passage.id}>
                    <td data-label="Passage"><div className="table-primary-cell"><BookOpen aria-hidden="true" /><span><strong>{passage.title}</strong><small>{passage.content.slice(0, 90)}{passage.content.length > 90 ? "..." : ""}</small></span></div></td>
                    <td data-label="Category"><span className="table-status neutral">{passage.category}</span></td>
                    <td data-label="File">{passage.attachmentUrl ? <a className="passage-file-link compact" href={passage.attachmentUrl} target="_blank" rel="noreferrer"><Paperclip aria-hidden="true" /> {passage.attachmentName || "Document"}</a> : <span className="table-muted">None</span>}</td>
                    <td data-label="Words">{wordCount(passage.content)}</td>
                    <td data-label="Updated">{new Date(passage.updatedAt || passage.createdAt).toLocaleDateString()}</td>
                    <td className="table-actions">
                      <RowActionMenu
                        label={`Actions for ${passage.title}`}
                        items={[
                          { label: "View", icon: Eye, onSelect: () => setDialog({ mode: "view", passage }) },
                          { label: "Edit", icon: Pencil, onSelect: () => openEdit(passage) },
                          { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => setConfirmAction({
                            title: "Delete passage?",
                            message: `"${passage.title}" will be removed. Questions using it may lose their stimulus.`,
                            confirmLabel: "Delete passage",
                            run: () => deletePassage(passage.id),
                          }) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No passages yet" message="Add the first reading stimulus to your library." actionLabel="Add passage" actionOnClick={openCreate} />
        )}
      </Card>

      <Modal
        open={dialog?.mode === "create" || dialog?.mode === "edit"}
        title={dialog?.mode === "edit" ? "Edit passage" : "Add passage"}
        className="modal-card-wide crm-form-modal"
        onClose={() => setDialog(null)}
        actions={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" form="passage-form" disabled={status?.type === "pending" || uploading}>{uploading ? "Uploading..." : status?.type === "pending" ? "Saving..." : "Save passage"}</Button></>}
      >
        <form id="passage-form" className="stack-form" onSubmit={form.handleSubmit(handleSave)}>
          <div className="crm-form-row">
            <label className="form-field"><span>Title</span><input {...form.register("title", { required: true, minLength: 2 })} /></label>
            <label className="form-field"><span>Category</span><input {...form.register("category", { required: true, minLength: 2 })} /></label>
          </div>
          <label className="form-field"><span>Content</span><textarea className="passage-edit-content" placeholder="Optional when a passage file is attached" {...form.register("content")} /></label>
          <div className="form-field">
            <span>Passage material</span>
            <label className="passage-file-picker">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading}
                onChange={(event) => {
                  handleFileUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Upload aria-hidden="true" />
              <span><b>{uploading ? "Uploading material..." : "Choose PDF, Word, or image"}</b><small>PDF, DOC, DOCX or image, up to 20 MB</small></span>
            </label>
            {attachment ? (
              <div className="passage-file-chip">
                <FileText aria-hidden="true" />
                <a href={attachment.url} target="_blank" rel="noreferrer">{attachment.name || "Attached document"}</a>
                <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}><X aria-hidden="true" /></button>
              </div>
            ) : null}
            {attachment ? <PassageAssetViewer passage={{ attachmentUrl: attachment.url, attachmentName: attachment.name, attachmentMimeType: attachment.mimeType }} compact /> : null}
          </div>
          {status?.type === "error" ? <p className="support-status error">{status.message}</p> : null}
        </form>
      </Modal>

      <Modal open={dialog?.mode === "view"} title={dialog?.passage?.title || "Passage"} className="modal-card-wide" onClose={() => setDialog(null)} actions={<Button variant="ghost" onClick={() => setDialog(null)}>Close</Button>}>
        {dialog?.passage ? <div className="passage-preview"><span className="pill">{dialog.passage.category}</span>{dialog.passage.content ? <p>{dialog.passage.content}</p> : null}<PassageAssetViewer passage={dialog.passage} /></div> : null}
      </Modal>

      <ConfirmActionModal open={Boolean(confirmAction)} title={confirmAction?.title} message={confirmAction?.message} confirmLabel={confirmAction?.confirmLabel} pending={confirmPending} onCancel={() => setConfirmAction(null)} onConfirm={runConfirmAction} />
    </AdminLayout>
  );
}
