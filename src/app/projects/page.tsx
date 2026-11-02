"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { useClientRecord } from "@/hooks/useClientRecord";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  FolderKanban,
  ArrowLeft,
  Globe,
  Palette,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Paperclip,
  X,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type EditRequest = Database["public"]["Tables"]["edit_requests"]["Row"];

const statusColors: Record<string, string> = {
  active: "bg-emerald-400/10 text-emerald-400",
  on_hold: "bg-amber-400/10 text-amber-400",
  completed: "bg-blue-400/10 text-blue-400",
  cancelled: "bg-red-400/10 text-red-400",
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const requestStatusColors: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-400",
  in_progress: "bg-blue-400/10 text-blue-400",
  completed: "bg-emerald-400/10 text-emerald-400",
  rejected: "bg-red-400/10 text-red-400",
};

const requestStatusLabels: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  rejected: "Ditolak",
};

const editTypes = [
  { value: "text", label: "Ubah Teks" },
  { value: "image", label: "Ganti Gambar" },
  { value: "content", label: "Tambah Konten" },
  { value: "remove", label: "Hapus Elemen" },
  { value: "layout", label: "Ubah Layout" },
  { value: "style", label: "Ubah Style/Warna" },
  { value: "bug", label: "Perbaiki Bug" },
  { value: "other", label: "Lainnya" },
];

const priorityOptions = [
  { value: "low", label: "Rendah" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Tinggi" },
];

// ─── Project Detail (Client View) ───────────────────────────────
function ProjectDetail({
  project,
  clientId,
  onBack,
}: {
  project: Project;
  clientId: string;
  onBack: () => void;
}) {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [project.id]);

  async function loadRequests() {
    const supabase = createClient();
    const { data } = await supabase
      .from("edit_requests")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }

  const specs = [
    { label: "Jenis Website", value: project.jenis_website },
    { label: "Mood Desain", value: project.mood_desain },
    { label: "Warna Brand", value: project.warna_brand },
    { label: "Logo", value: project.status_logo },
    { label: "Budget", value: project.budget_tier },
    { label: "Tujuan", value: project.tujuan_utama },
    { label: "Halaman", value: project.halaman_section },
    { label: "Kesiapan Konten", value: project.kesiapan_konten },
    { label: "Domain", value: project.status_domain },
    { label: "Hosting", value: project.status_hosting },
  ].filter((s) => s.value);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold truncate">{project.name}</h1>
            <span
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[project.status] ?? "bg-white/10 text-muted"}`}
            >
              {statusLabels[project.status] ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          {project.start_date && (
            <span>
              Mulai: {new Date(project.start_date).toLocaleDateString("id-ID")}
            </span>
          )}
          {project.end_date && (
            <span>
              Target: {new Date(project.end_date).toLocaleDateString("id-ID")}
            </span>
          )}
          {project.site_url && (
            <a
              href={project.site_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline flex items-center gap-1"
            >
              <ExternalLink size={12} /> Lihat Website
            </a>
          )}
        </div>
      </div>

      {/* Specs */}
      {specs.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5 mb-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Palette size={14} className="text-muted" /> Spesifikasi Website
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {specs.map((s) => (
              <div
                key={s.label}
                className="bg-foreground/5 rounded-lg px-3 py-2"
              >
                <span className="text-[10px] text-muted uppercase tracking-wider">
                  {s.label}
                </span>
                <p className="text-sm text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          {project.usp && (
            <div className="mt-3 bg-foreground/5 rounded-lg px-3 py-2">
              <span className="text-[10px] text-muted uppercase tracking-wider">
                USP
              </span>
              <p className="text-sm text-foreground mt-0.5">{project.usp}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Requests */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText size={14} className="text-muted" /> Edit Requests
          </h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} /> Request Baru
          </button>
        </div>

        {showForm && (
          <EditRequestForm
            projectId={project.id}
            clientId={clientId}
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              loadRequests();
            }}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <Clock size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada edit request</p>
            <p className="text-xs mt-1">
              Klik &quot;Request Baru&quot; untuk mengajukan perubahan
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="bg-foreground/5 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        {editTypes.find((t) => t.value === r.type)?.label ?? r.type}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${requestStatusColors[r.status] ?? "bg-white/10 text-muted"}`}
                      >
                        {requestStatusLabels[r.status] ?? r.status}
                      </span>
                      {r.priority === "high" && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400">
                          Prioritas Tinggi
                        </span>
                      )}
                    </div>
                    {r.section && (
                      <p className="text-xs text-muted mt-1">
                        Bagian: {r.section}
                      </p>
                    )}
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                      {r.description}
                    </p>
                    {r.reference_url && (
                      <a
                        href={r.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> Referensi
                      </a>
                    )}
                    {r.admin_notes && (
                      <div className="mt-2 bg-blue-400/5 border border-blue-400/10 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-blue-400 uppercase tracking-wider">
                          Catatan Admin
                        </span>
                        <p className="text-sm text-foreground mt-0.5">
                          {r.admin_notes}
                        </p>
                      </div>
                    )}
                    {r.rejection_reason && (
                      <div className="mt-2 bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
                        <span className="text-[10px] text-red-400 uppercase tracking-wider">
                          Alasan Ditolak
                        </span>
                        <p className="text-sm text-foreground mt-0.5">
                          {r.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {new Date(r.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Request Form ──────────────────────────────────────────
function EditRequestForm({
  projectId,
  clientId,
  onClose,
  onCreated,
}: {
  projectId: string;
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState("text");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Deskripsi wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.from("edit_requests").insert({
      project_id: projectId,
      client_id: clientId,
      type,
      section: section || null,
      description: description.trim(),
      reference_url: referenceUrl || null,
      priority,
    });

    if (err) {
      setError(err.message);
      setSubmitting(false);
    } else {
      // Fire Make.com webhook for WA notification (fire-and-forget)
      fetch("https://hook.us2.make.com/zo4qo5c2imxccxpm239cj20if9s3jh7r", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          section: section || null,
          description: description.trim(),
          reference_url: referenceUrl || null,
          priority,
          project_id: projectId,
          client_id: clientId,
        }),
      }).catch(() => {});
      onCreated();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-foreground/5 border border-foreground/10 rounded-xl p-4 mb-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Request Edit Baru</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Tipe Perubahan</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            {editTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Prioritas</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            {priorityOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">
          Bagian/Halaman (opsional)
        </label>
        <input
          type="text"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="cth: Halaman Home, Section Hero, Footer"
          className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
        />
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">Deskripsi *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Jelaskan perubahan yang diinginkan secara detail..."
          className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">
          Link Referensi (opsional)
        </label>
        <input
          type="url"
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-foreground px-4 py-2 rounded-lg transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Kirim Request
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const { client, loading: clientLoading } = useClientRecord(
    !isAdmin ? user?.id : null
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin && clientLoading) return;

    async function load() {
      const supabase = createClient();
      let q = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        if (!client) {
          setProjects([]);
          setLoading(false);
          return;
        }
        q = q.eq("client_id", client.id);
      }

      const { data } = await q;
      setProjects(data ?? []);
      setLoading(false);
    }
    load();
  }, [user, isAdmin, client, clientLoading]);

  if (selectedProject && client) {
    return (
      <DashboardLayout>
        <ProjectDetail
          project={selectedProject}
          clientId={client.id}
          onBack={() => setSelectedProject(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        {isAdmin && (
          <a
            href="/admin?tab=new-project"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Project Baru
          </a>
        )}
      </div>

      {loading || clientLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <FolderKanban size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada project</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => !isAdmin && setSelectedProject(p)}
              className={`bg-card border border-card-border rounded-xl p-5 transition-colors ${
                !isAdmin
                  ? "cursor-pointer hover:border-accent/30"
                  : "hover:border-accent/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      {p.progress}%
                    </span>
                    {p.start_date && (
                      <span>
                        Mulai:{" "}
                        {new Date(p.start_date).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    {p.end_date && (
                      <span>
                        Target:{" "}
                        {new Date(p.end_date).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    {p.site_url && (
                      <a
                        href={p.site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe size={12} /> Website
                      </a>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[p.status] ?? "bg-white/10 text-muted"}`}
                >
                  {statusLabels[p.status] ?? p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
