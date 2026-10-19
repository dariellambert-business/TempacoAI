"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Search,
  FolderOpen,
} from "lucide-react";
import { ProjectModal } from "@/components/ProjectModal";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("manage-projects");
  const [clients, setClients] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage projects state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form states — project
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pClient, setPClient] = useState("");
  const [pStatus, setPStatus] = useState("active");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");

  // Form states — invoice
  const [iProject, setIProject] = useState("");
  const [iClient, setIClient] = useState("");
  const [iNumber, setINumber] = useState("");
  const [iAmount, setIAmount] = useState("");
  const [iStatus, setIStatus] = useState("draft");
  const [iDue, setIDue] = useState("");
  const [iNotes, setINotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t) setTab(t);
    }
  }, []);

  async function loadData() {
    const supabase = createClient();
    const [clientsRes, projectsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "client")
        .order("full_name"),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
    ]);
    setClients(clientsRes.data ?? []);
    setProjects(projectsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!pName || !pClient) return;
    setSubmitting(true);
    setSuccess("");
    const supabase = createClient();
    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        name: pName,
        description: pDesc,
        client_id: pClient,
        status: pStatus,
        start_date: pStart || null,
        end_date: pEnd || null,
      })
      .select()
      .single();

    if (!error && newProject) {
      // Log activity
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.from("activity_log").insert({
        project_id: newProject.id,
        actor_id: session?.user?.id ?? null,
        action: "create",
        details: `Project "${pName}" dibuat`,
      });

      setSuccess("Project berhasil dibuat!");
      setPName("");
      setPDesc("");
      setPStatus("active");
      setPStart("");
      setPEnd("");
      await loadData();
    }
    setSubmitting(false);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!iProject || !iClient || !iNumber || !iAmount) return;
    setSubmitting(true);
    setSuccess("");
    const supabase = createClient();
    const { error } = await supabase.from("invoices").insert({
      project_id: iProject,
      client_id: iClient,
      invoice_number: iNumber,
      amount: parseInt(iAmount, 10),
      status: iStatus,
      due_date: iDue || null,
      notes: iNotes,
    });
    if (!error) {
      setSuccess("Invoice berhasil dibuat!");
      setINumber("");
      setIAmount("");
      setIStatus("draft");
      setIDue("");
      setINotes("");
    }
    setSubmitting(false);
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted">
          <p>Kamu tidak punya akses ke halaman ini.</p>
        </div>
      </DashboardLayout>
    );
  }

  const inputClass =
    "w-full bg-input-bg border border-input-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent";
  const labelClass = "block text-sm text-muted mb-1";

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (clients.find((c) => c.id === p.client_id)?.full_name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-card-border rounded-lg p-1 w-fit">
        {[
          { key: "manage-projects", label: "Kelola Project" },
          { key: "new-project", label: "Project Baru" },
          { key: "new-invoice", label: "Invoice Baru" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSuccess("");
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : (
        <>
          {/* Kelola Project Tab */}
          {tab === "manage-projects" && (
            <div>
              {/* Search & filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    placeholder="Cari project atau client..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={inputClass + " pl-9"}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={inputClass + " sm:w-40"}
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="on_hold">Ditunda</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>

              {/* Project cards */}
              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted">
                  <FolderOpen size={48} className="mb-3 opacity-40" />
                  <p className="text-sm">
                    {projects.length === 0
                      ? "Belum ada project"
                      : "Tidak ada project yang cocok"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredProjects.map((p) => {
                    const client = clients.find((c) => c.id === p.client_id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="bg-card border border-card-border rounded-xl p-5 text-left hover:border-accent/40 transition-colors group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate pr-2">
                            {p.name}
                          </h3>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusColors[p.status] ?? "bg-gray-400/15 text-gray-400 border-gray-400/25"}`}
                          >
                            {statusLabels[p.status] ?? p.status}
                          </span>
                        </div>

                        <p className="text-sm text-muted mb-3">
                          {client?.full_name || "Unknown client"}
                          {client?.company ? ` — ${client.company}` : ""}
                        </p>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-muted mb-1">
                            <span>Progress</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Dates */}
                        {(p.start_date || p.end_date) && (
                          <p className="text-xs text-muted mt-2">
                            {p.start_date &&
                              new Date(p.start_date).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                            {p.start_date && p.end_date && " — "}
                            {p.end_date &&
                              new Date(p.end_date).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Modal */}
              {selectedProject && (
                <ProjectModal
                  project={selectedProject}
                  clients={clients}
                  onClose={() => setSelectedProject(null)}
                  onSaved={() => {
                    setSelectedProject(null);
                    loadData();
                  }}
                  onDeleted={() => {
                    setSelectedProject(null);
                    loadData();
                  }}
                />
              )}
            </div>
          )}

          {/* Project Baru Tab */}
          {tab === "new-project" && (
            <div className="max-w-lg">
              {success && (
                <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
                  {success}
                  <button onClick={() => setSuccess("")}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                onSubmit={createProject}
                className="bg-card border border-card-border rounded-xl p-6 space-y-4"
              >
                <h2 className="text-lg font-semibold">Buat Project Baru</h2>
                <div>
                  <label className={labelClass}>Client *</label>
                  <select
                    value={pClient}
                    onChange={(e) => setPClient(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Pilih client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.id} — {c.company || "No company"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nama Project *</label>
                  <input
                    type="text"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className={inputClass}
                    placeholder="Nama project"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Deskripsi</label>
                  <textarea
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    className={inputClass + " h-24 resize-none"}
                    placeholder="Deskripsi singkat..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Aktif</option>
                      <option value="on_hold">Ditunda</option>
                      <option value="completed">Selesai</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Mulai</label>
                    <input
                      type="date"
                      value={pStart}
                      onChange={(e) => setPStart(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Tanggal Selesai</label>
                  <input
                    type="date"
                    value={pEnd}
                    onChange={(e) => setPEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Buat Project
                </button>
              </form>
            </div>
          )}

          {/* Invoice Baru Tab */}
          {tab === "new-invoice" && (
            <div className="max-w-lg">
              {success && (
                <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
                  {success}
                  <button onClick={() => setSuccess("")}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                onSubmit={createInvoice}
                className="bg-card border border-card-border rounded-xl p-6 space-y-4"
              >
                <h2 className="text-lg font-semibold">Buat Invoice Baru</h2>
                <div>
                  <label className={labelClass}>Client *</label>
                  <select
                    value={iClient}
                    onChange={(e) => {
                      setIClient(e.target.value);
                      setIProject("");
                    }}
                    className={inputClass}
                    required
                  >
                    <option value="">Pilih client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.id} — {c.company || "No company"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Project *</label>
                  <select
                    value={iProject}
                    onChange={(e) => setIProject(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Pilih project...</option>
                    {projects
                      .filter((p) => !iClient || p.client_id === iClient)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>No. Invoice *</label>
                    <input
                      type="text"
                      value={iNumber}
                      onChange={(e) => setINumber(e.target.value)}
                      className={inputClass}
                      placeholder="INV-001"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Jumlah (Rp) *</label>
                    <input
                      type="number"
                      value={iAmount}
                      onChange={(e) => setIAmount(e.target.value)}
                      className={inputClass}
                      placeholder="5000000"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={iStatus}
                      onChange={(e) => setIStatus(e.target.value)}
                      className={inputClass}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Terkirim</option>
                      <option value="paid">Lunas</option>
                      <option value="overdue">Jatuh Tempo</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Jatuh Tempo</label>
                    <input
                      type="date"
                      value={iDue}
                      onChange={(e) => setIDue(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Catatan</label>
                  <textarea
                    value={iNotes}
                    onChange={(e) => setINotes(e.target.value)}
                    className={inputClass + " h-20 resize-none"}
                    placeholder="Catatan tambahan..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Buat Invoice
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
