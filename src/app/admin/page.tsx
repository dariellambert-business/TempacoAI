"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("new-project");
  const [clients, setClients] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Read tab from URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t) setTab(t);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [clientsRes, projectsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "client")
          .order("full_name"),
        supabase.from("projects").select("*").order("name"),
      ]);
      setClients(clientsRes.data ?? []);
      setProjects(projectsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!pName || !pClient) return;
    setSubmitting(true);
    setSuccess("");
    const supabase = createClient();
    const { error } = await supabase.from("projects").insert({
      name: pName,
      description: pDesc,
      client_id: pClient,
      status: pStatus,
      start_date: pStart || null,
      end_date: pEnd || null,
    });
    if (!error) {
      setSuccess("Project berhasil dibuat!");
      setPName("");
      setPDesc("");
      setPStatus("active");
      setPStart("");
      setPEnd("");
      // Refresh projects
      const { data } = await supabase.from("projects").select("*").order("name");
      setProjects(data ?? []);
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
    "w-full bg-input-bg border border-input-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent";
  const labelClass = "block text-sm text-muted mb-1";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-card-border rounded-lg p-1 w-fit">
        {[
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
                : "text-muted hover:text-white"
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
        <div className="max-w-lg">
          {success && (
            <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
              {success}
              <button onClick={() => setSuccess("")}>
                <X size={14} />
              </button>
            </div>
          )}

          {tab === "new-project" && (
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
          )}

          {tab === "new-invoice" && (
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
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
