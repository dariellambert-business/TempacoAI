"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  ClipboardEdit,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  X,
  ExternalLink,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type EditRequest = Database["public"]["Tables"]["edit_requests"]["Row"];

type RequestWithRelations = EditRequest & {
  clients: { nama: string } | null;
  projects: { name: string } | null;
};

const editTypeLabels: Record<string, string> = {
  text: "Ubah Teks",
  image: "Ganti Gambar",
  content: "Tambah Konten",
  remove: "Hapus Elemen",
  layout: "Ubah Layout",
  style: "Ubah Style",
  bug: "Perbaiki Bug",
  other: "Lainnya",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-400 border-amber-400/25",
  in_progress: "bg-blue-400/15 text-blue-400 border-blue-400/25",
  completed: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25",
  rejected: "bg-red-400/15 text-red-400 border-red-400/25",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  rejected: "Ditolak",
};

export function AdminEditRequests() {
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RequestWithRelations | null>(null);

  async function loadRequests() {
    const supabase = createClient();
    const { data } = await supabase
      .from("edit_requests")
      .select("*, clients(nama), projects(name)")
      .order("created_at", { ascending: false });
    setRequests((data as RequestWithRelations[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = requests.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchDesc = r.description.toLowerCase().includes(s);
      const matchClient = r.clients?.nama.toLowerCase().includes(s);
      const matchProject = r.projects?.name.toLowerCase().includes(s);
      const matchSection = r.section?.toLowerCase().includes(s);
      if (!matchDesc && !matchClient && !matchProject && !matchSection)
        return false;
    }
    return true;
  });

  return (
    <div>
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari request..."
            className="w-full bg-card border border-card-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/50"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: "all", label: "Semua" },
          { value: "pending", label: "Menunggu" },
          { value: "in_progress", label: "Dikerjakan" },
          { value: "completed", label: "Selesai" },
          { value: "rejected", label: "Ditolak" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === f.value
                ? "bg-accent text-white"
                : "bg-foreground/5 text-muted hover:text-foreground"
            }`}
          >
            {f.label} ({f.value === "all" ? requests.length : requests.filter((r) => r.status === f.value).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <ClipboardEdit size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada edit request</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="bg-card border border-card-border rounded-xl p-4 cursor-pointer hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                      {editTypeLabels[r.type] ?? r.type}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[r.status] ?? "bg-white/10 text-muted"}`}
                    >
                      {statusLabels[r.status] ?? r.status}
                    </span>
                    {r.priority === "high" && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                        Prioritas Tinggi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted mb-1">
                    <span>{r.clients?.nama ?? "—"}</span>
                    <span>•</span>
                    <span>{r.projects?.name ?? "—"}</span>
                    {r.section && (
                      <>
                        <span>•</span>
                        <span>{r.section}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {r.description}
                  </p>
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

      {/* Detail Modal */}
      {selected && (
        <EditRequestModal
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            loadRequests();
          }}
        />
      )}
    </div>
  );
}

// ─── Edit Request Detail Modal (Admin) ──────────────────────────
function EditRequestModal({
  request,
  onClose,
  onUpdated,
}: {
  request: RequestWithRelations;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? "");
  const [rejectionReason, setRejectionReason] = useState(
    request.rejection_reason ?? ""
  );
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(status: string) {
    setUpdating(true);
    setError("");
    const supabase = createClient();
    const updates: Database["public"]["Tables"]["edit_requests"]["Update"] = {
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    if (status === "rejected") {
      updates.rejection_reason = rejectionReason || null;
    }
    const { error: err } = await supabase
      .from("edit_requests")
      .update(updates)
      .eq("id", request.id);
    if (err) {
      setError(err.message);
      setUpdating(false);
    } else {
      onUpdated();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-card-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Edit Request
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[request.status]}`}
              >
                {statusLabels[request.status] ?? request.status}
              </span>
              <span className="text-xs text-muted">
                {request.clients?.nama}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                {editTypeLabels[request.type] ?? request.type}
              </span>
              {request.priority === "high" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400">
                  Prioritas Tinggi
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Project: {request.projects?.name}
            </p>
            {request.section && (
              <p className="text-xs text-muted">Bagian: {request.section}</p>
            )}
          </div>

          <div className="bg-foreground/5 rounded-lg p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {request.description}
            </p>
          </div>

          {request.reference_url && (
            <a
              href={request.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink size={10} /> Link Referensi
            </a>
          )}

          {/* Admin Notes */}
          <div>
            <label className="text-xs text-muted mb-1 block">
              Catatan Admin
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Tambah catatan untuk client..."
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 resize-none"
            />
          </div>

          {/* Rejection reason (only show if rejecting) */}
          {request.status !== "rejected" && (
            <div>
              <label className="text-xs text-muted mb-1 block">
                Alasan Tolak (jika ditolak)
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Opsional"
                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-card-border">
            {request.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus("in_progress")}
                  disabled={updating}
                  className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Play size={14} /> Kerjakan
                </button>
                <button
                  onClick={() => updateStatus("rejected")}
                  disabled={updating}
                  className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <XCircle size={14} /> Tolak
                </button>
              </>
            )}
            {request.status === "in_progress" && (
              <>
                <button
                  onClick={() => updateStatus("completed")}
                  disabled={updating}
                  className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <CheckCircle2 size={14} /> Selesai
                </button>
                <button
                  onClick={() => updateStatus("rejected")}
                  disabled={updating}
                  className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <XCircle size={14} /> Tolak
                </button>
              </>
            )}
            {request.status === "completed" && (
              <button
                onClick={() => updateStatus("in_progress")}
                disabled={updating}
                className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Clock size={14} /> Buka Kembali
              </button>
            )}
            {request.status === "rejected" && (
              <button
                onClick={() => updateStatus("pending")}
                disabled={updating}
                className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Clock size={14} /> Buka Kembali
              </button>
            )}
            {/* Save notes without changing status */}
            <button
              onClick={async () => {
                setUpdating(true);
                const supabase = createClient();
                await supabase
                  .from("edit_requests")
                  .update({
                    admin_notes: adminNotes || null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", request.id);
                onUpdated();
              }}
              disabled={updating}
              className="flex items-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors ml-auto"
            >
              {updating && <Loader2 size={14} className="animate-spin" />}
              Simpan Catatan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
