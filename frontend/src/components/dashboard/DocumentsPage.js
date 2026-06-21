import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { api, fileViewUrl } from "@/lib/api";
import { cn, fmtDate, fileSize, isImageFile, isPdfFile, isSheetFile, isWordFile } from "@/lib/utils";
import { 
  SectionTitle, Btn, Plus, Filter, Search, StyledSelect, StyledDatePicker, 
  Spinner, EmptyState, FolderOpen, FileText, FileSpreadsheet, FileType, 
  FileImage, Badge, Eye, Upload, Trash2, ChevronLeft, ChevronRight,
  Modal, Input, TextArea, ConfirmModal, VisibilitySelector
} from "../ui/SharedComponents";

const DocModal = ({ open, onClose, doc, token, onSaved }) => {
  const [form, setForm] = useState({ name: "", description: "", tags: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const data = await api("/users", {}, token);
      setUsers(data.users || []);
    } catch { }
  };

  useEffect(() => {
    if (doc) {
      setForm({ name: doc.name || "", description: doc.description || "", tags: doc.tags?.join(", ") || "" });
      if (doc.visibleToAll) {
        setVisibility("all");
      } else if (doc.visibleToUsers?.length > 0) {
        setVisibility("users");
        setSelectedUsers(doc.visibleToUsers.map(u => u._id || u));
      } else {
        setVisibility("private");
        setSelectedUsers([]);
      }
    } else {
      setForm({ name: "", description: "", tags: "" });
      setVisibility("all");
      setSelectedUsers([]);
    }
    setFile(null);
  }, [doc, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Document name required");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      fd.append("tags", JSON.stringify(tagsArr));
      fd.append("visibleToAll", visibility === "all");
      fd.append("visibleToUsers", JSON.stringify(visibility === "users" ? selectedUsers : []));
      if (file) fd.append("file", file);
      if (doc) {
        await api(`/documents/${doc._id || doc.id}`, { method: "PUT", body: fd }, token);
        toast.success("Document updated");
      } else {
        await api("/documents", { method: "POST", body: fd }, token);
        toast.success("Document uploaded");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={doc ? "Edit document" : "Add document"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Document name" placeholder="e.g. Invoice Q1 2024" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <TextArea label="Description" rows={3} placeholder="Optional description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <Input label="Tags" placeholder="invoice, q1, finance" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        <VisibilitySelector 
          value={visibility}
          onChange={setVisibility}
          users={users}
          selectedUsers={selectedUsers}
          onUsersChange={setSelectedUsers}
        />
        <div className="space-y-2">
          <label className="block text-sm font-600 text-[#5c554f]">Attach file</label>
          <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition", file ? "border-[#cfc3b8] bg-[#f7f2ec]" : "border-[#e8e0d8] bg-white hover:bg-[#faf7f3]")}>
            <Upload className="h-5 w-5 text-[#8a8179]" />
            <span className="text-sm text-[#6f6760]">{file ? file.name : doc?.fileName || "Click to upload or drag file"}</span>
            <span className="text-xs text-[#a19790]">PDF, DOC, XLS, PNG, JPG up to 10MB</span>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <Btn type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn type="submit" loading={loading} className="flex-1">{doc ? "Update" : "Upload"}</Btn>
        </div>
      </form>
    </Modal>
  );
};

export default function DocumentsPage({ token }) {
  const [docs, setDocs] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ name: "", tag: "", startDate: "", endDate: "" });
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadDocs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 12 });
      if (search.name) params.append("name", search.name);
      if (search.tag) params.append("tag", search.tag);
      if (search.startDate) params.append("startDate", search.startDate);
      if (search.endDate) params.append("endDate", search.endDate);
      const data = await api(`/documents?${params.toString()}`, {}, token);
      setDocs(data.documents || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  const loadTags = useCallback(async () => {
    try {
      const data = await api("/documents/tags", {}, token);
      setTags(data.tags || []);
    } catch { }
  }, [token]);

  useEffect(() => {
    loadDocs();
    loadTags();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await api(`/documents/${deleteDoc._id || deleteDoc.id}`, { method: "DELETE" }, token);
      toast.success("Document deleted");
      setDeleteDoc(null);
      loadDocs(page);
      loadTags();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const tagOptions = [{ label: "All tags", value: "" }].concat(tags.map((t) => ({ label: t, value: t })));
  const fileTypeLabel = (mime) => {
    if (isPdfFile(mime)) return "PDF";
    if (isImageFile(mime)) return "Image";
    if (isSheetFile(mime)) return "Sheet";
    if (isWordFile(mime)) return "Doc";
    return "File";
  };

  const getOwnerLabel = (doc) => {
    if (doc.userId?._id === doc.userId) return "You";
    return doc.userId?.name || "Unknown";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SectionTitle title="Documents" subtitle="Store and manage your important files." action={<Btn onClick={() => { setEditDoc(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Add document</Btn>} />
      <div className="rounded-[32px]  bg-[#fcfaf7] p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="block text-xs font-600 text-[#5f6368]">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#80868b]" />
              <input placeholder="Search by name..." value={search.name} onChange={(e) => setSearch((s) => ({ ...s, name: e.target.value }))} className="h-[48px] w-full rounded-lg bg-[#f1f3f4] py-2.5 pl-10 pr-3 text-sm font-500 text-[#3c4043] outline-none placeholder:text-[#9aa0a6]" />
            </div>
          </div>
          <StyledSelect label="Tag" value={search.tag} onChange={(next) => setSearch((s) => ({ ...s, tag: next }))} options={tagOptions} placeholder="All tags" />
          <StyledDatePicker label="From date" value={search.startDate} onChange={(next) => setSearch((s) => ({ ...s, startDate: next }))} compact />
          <div className="grid gap-4">
            <StyledDatePicker label="To date" value={search.endDate} onChange={(next) => setSearch((s) => ({ ...s, endDate: next }))} compact />
            <Btn onClick={() => loadDocs(1)} className="gap-2"><Filter className="h-4 w-4" />Search</Btn>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-[30px] border-[#ebe3db] bg-[#fcfaf7]">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Spinner className="h-8 w-8 text-[#7e756e]" /></div>
        ) : docs.length === 0 ? (
          <div className="p-8"><EmptyState icon={<FolderOpen className="h-5 w-5" />} title="No documents found" text="Upload your first document to start building your archive." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-[#f0e9e2] text-left text-xs font-700 uppercase tracking-[0.12em] text-[#9d938b]">
                  <th className="px-5 py-4">Name</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Tags</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Created</th><th className="px-5 py-4">Size</th><th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc._id || doc.id} className="border-b border-[#f5efe9] last:border-b-0 hover:bg-[#faf7f3]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4efe8] text-[#746b64]">
                          {isPdfFile(doc.mimeType) ? <FileText className="h-4 w-4" /> : isSheetFile(doc.mimeType) ? <FileSpreadsheet className="h-4 w-4" /> : isWordFile(doc.mimeType) ? <FileType className="h-4 w-4" /> : isImageFile(doc.mimeType) ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0"><p className="truncate font-700 text-[#201c1a]">{doc.name}</p><p className="truncate text-xs text-[#968c84]">{doc.fileName || "Stored file"}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge color="blue">{getOwnerLabel(doc)}</Badge></td>
                    <td className="px-5 py-4"><Badge color={isImageFile(doc.mimeType) ? "purple" : isPdfFile(doc.mimeType) ? "red" : isSheetFile(doc.mimeType) ? "green" : "blue"}>{fileTypeLabel(doc.mimeType)}</Badge></td>
                    <td className="px-5 py-4"><div className="flex max-w-[220px] flex-wrap gap-2">{(doc.tags || []).length ? doc.tags.slice(0, 3).map((tag) => <Badge key={tag} color="blue">{tag}</Badge>) : <span className="text-xs text-[#a79d95]">No tags</span>}</div></td>
                    <td className="px-5 py-4 text-[#6f6760] max-w-[240px]"><p className="truncate">{doc.description || "-"}</p></td>
                    <td className="px-5 py-4 text-[#6f6760]">{fmtDate(doc.createdAt)}</td>
                    <td className="px-5 py-4 text-[#6f6760]">{fileSize(doc.fileSize) || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {doc.fileUrl && <a href={fileViewUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#f4efe8] hover:text-[#201c1a]" title="Open"><Eye className="h-4 w-4" /></a>}
                        {doc.userId?._id === doc.userId && (
                          <>
                            <button onClick={() => { setEditDoc(doc); setShowModal(true); }} className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#f4efe8] hover:text-[#201c1a]" title="Edit"><Upload className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteDoc(doc)} className="rounded-xl p-2 text-[#8f857d] transition hover:bg-[#fdeaea] hover:text-[#b85555]" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-[#eee6df] p-4">
            <Btn variant="outline" onClick={() => loadDocs(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Btn>
            <span className="text-sm text-[#7f766e]">Page {page} of {totalPages}</span>
            <Btn variant="outline" onClick={() => loadDocs(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Btn>
          </div>
        )}
      </div>
      <DocModal open={showModal} onClose={() => { setShowModal(false); setEditDoc(null); }} doc={editDoc} token={token} onSaved={() => { loadDocs(page); loadTags(); setShowModal(false); setEditDoc(null); }} />
      <ConfirmModal open={!!deleteDoc} onClose={() => setDeleteDoc(null)} onConfirm={handleDeleteConfirm} loading={deleting} title="Delete document?" description={`This will permanently remove "${deleteDoc?.name || "this document"}".`} confirmText="Delete" confirmVariant="danger" />
    </div>
  );
}
