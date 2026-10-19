"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import {
  X,
  Loader2,
  Save,
  Trash2,
  Upload,
  Download,
  FileText,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectFile = Database["public"]["Tables"]["project_files"]["Row"];
type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

type Props = {
  project: Project;
  clients: Profile[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25",
  on_hold: "bg-amber-400/15 text-amber-400 border-amber-400/25",
  completed: "bg-blue-400/15 text-blue-400 border-blue-400/25",
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
};

export function ProjectModal({
  project,
  clients,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [tab, setTab] = useState<"detail" | "files" | "activity">("detail");

  // Detail form
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description);
  const [clientId, setClientId] = useState(project.client_id);
  const [status, setStatus] = useState(project.status);
  const [progress, setProgress] = useState(project.progress);
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [endDate, setEndDate] = useState(project.end_date ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Files
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activity
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const inputClass =
    "w-full bg-input-bg border border-input-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
  const labelClass = "block text-sm text-muted mb-1";

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
  }

  async function loadActivity() {
    setLoadingActivity(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setActivities(data ?? []);
    setLoadingActivity(false);
  }

  useEffect(() => {
    if (tab === "activity") loadActivity();
  }, [tab]);

  async function logActivity(action: string, details: string) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await supabase.from("activity_log").insert({
      project_id: project.id,
      actor_id: session?.user?.id ?? null,
      action,
      details,
    });
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    // Build change log
    const changes: string[] = [];
    if (name !== project.name) changes.push(`Nama: "${project.name}" → "${name}"`);
    if (status !== project.status)
      changes.push(
        `Status: ${statusLabels[project.status] ?? project.status} → ${statusLabels[status] ?? status}`
      );
    if (progress !== project.progress)
      changes.push(`Progress: ${project.progress}% → ${progress}%`);
    if (desc !== project.description) changes.push("Deskripsi diperbarui");
    if (startDate !== (project.start_date ?? "")) changes.push("Tanggal mulai diperbarui");
    if (endDate !== (project.end_date ?? "")) changes.push("Tanggal selesai diperbarui");
    if (clientId !== project.client_id) changes.push("Client diubah");

    const { error } = await supabase
      .from("projects")
      .update({
        name,
        description: desc,
        client_id: clientId,
        status,
        progress,
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    if (!error && changes.length > 0) {
      await logActivity("update", changes.join("; "));
    }

    setSaving(false);
    if (!error) onSaved();
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();

    // Delete files from storage first
    if (files.length > 0) {
      const paths = files.map(
        (f) => `${project.id}/${f.file_name}`
      );
      await supabase.storage.from("project-files").remove(paths);
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);
    setDeleting(false);
    if (!error) onDeleted();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    for (const file of Array.from(fileList)) {
      const path = `${project.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("project-files").getPublicUrl(path);

        await supabase.from("project_files").insert({
          project_id: project.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: session?.user?.id ?? null,
        });

        await logActivity("file_upload", `File diupload: ${file.name}`);
      }
    }

    await loadFiles();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteFile(file: ProjectFile) {
    const supabase = createClient();
    const path = `${project.id}/${file.file_name}`;
    await supabase.storage.from("project-files").remove([path]);
    await supabase.from("project_files").delete().eq("id", file.id);
    await logActivity("file_delete", `File dihapus: ${file.file_name}`);
    await loadFiles();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const actionLabels: Record<string, string> = {
    create: "Project dibuat",
    update: "Project diperbarui",
    file_upload: "File diupload",
    file_delete: "File dihapus",
  };

  const clientName =
    clients.find((c) => c.id === project.client_id)?.full_name || "Unknown";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{project.name}</h2>
            <p className="text-sm text-muted">{clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[project.status] ?? "bg-gray-400/15 text-gray-400 border-gray-400/25"}`}
            >
              {statusLabels[project.status] ?? project.status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0">
          {(["detail", "files", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "detail"
                ? "Detail"
                : t === "files"
                  ? `Files${files.length > 0 ? ` (${files.length})` : ""}`
                  : "Activity"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "detail" && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nama Project *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className={inputClass + " h-24 resize-none"}
                />
              </div>
              <div>
                <label className={labelClass}>Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={inputClass}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.id} — {c.company || "No company"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={inputClass}
                  >
                    <option value="active">Aktif</option>
                    <option value="on_hold">Ditunda</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Progress ({progress}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="w-full accent-accent mt-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tanggal Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Selesai</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "files" && (
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {uploading ? "Mengupload..." : "Upload File"}
                </button>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <FileText size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between bg-input-bg border border-input-border rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText
                          size={18}
                          className="text-accent shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {f.file_name}
                          </p>
                          <p className="text-xs text-muted">
                            {formatSize(f.file_size)} •{" "}
                            {formatDate(f.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-foreground/5 text-muted hover:text-foreground transition-colors"
                        >
                          <Download size={15} />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(f)}
                          className="p-2 rounded-lg hover:bg-red-400/10 text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div>
              {loadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-muted" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <Clock size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada aktivitas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex gap-3 text-sm"
                    >
                      <div className="mt-1 shrink-0">
                        <ChevronRight size={14} className="text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {actionLabels[a.action] ?? a.action}
                        </p>
                        {a.details && (
                          <p className="text-muted text-xs mt-0.5">
                            {a.details}
                          </p>
                        )}
                        <p className="text-muted text-xs mt-0.5">
                          {formatDate(a.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-card-border">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">Yakin hapus?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Ya, hapus"
                  )}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm text-muted hover:text-foreground px-2 py-1.5"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
                Hapus Project
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !name}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
