"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { useClientRecord } from "@/hooks/useClientRecord";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  ClipboardEdit,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type EditRequest = Database["public"]["Tables"]["edit_requests"]["Row"];

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
  pending: "bg-amber-400/10 text-amber-400",
  in_progress: "bg-blue-400/10 text-blue-400",
  completed: "bg-emerald-400/10 text-emerald-400",
  rejected: "bg-red-400/10 text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  rejected: "Ditolak",
};

type RequestWithProject = EditRequest & { projects: { name: string } | null };

export default function EditRequestsPage() {
  const { user, isAdmin } = useAuth();
  const { client, loading: clientLoading } = useClientRecord(
    !isAdmin ? user?.id : null
  );
  const [requests, setRequests] = useState<RequestWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!client) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("edit_requests")
        .select("*, projects(name)")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      setRequests((data as RequestWithProject[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [client]);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Requests</h1>
      </div>

      {/* Filters */}
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
            {f.label}
            {f.value === "all" && ` (${requests.length})`}
            {f.value !== "all" &&
              ` (${requests.filter((r) => r.status === f.value).length})`}
          </button>
        ))}
      </div>

      {loading || clientLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <ClipboardEdit size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada edit request</p>
          <p className="text-xs mt-1">
            Buat request dari halaman detail project
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-card-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                      {editTypeLabels[r.type] ?? r.type}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[r.status] ?? "bg-white/10 text-muted"}`}
                    >
                      {statusLabels[r.status] ?? r.status}
                    </span>
                    {r.priority === "high" && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400">
                        Prioritas Tinggi
                      </span>
                    )}
                  </div>
                  {r.projects && (
                    <p className="text-xs text-muted mb-1">
                      Project: {r.projects.name}
                    </p>
                  )}
                  {r.section && (
                    <p className="text-xs text-muted">Bagian: {r.section}</p>
                  )}
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                    {r.description}
                  </p>
                  {r.reference_url && (
                    <a
                      href={r.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Referensi
                    </a>
                  )}
                  {r.admin_notes && (
                    <div className="mt-3 bg-blue-400/5 border border-blue-400/10 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-blue-400 uppercase tracking-wider">
                        Catatan Admin
                      </span>
                      <p className="text-sm text-foreground mt-0.5">
                        {r.admin_notes}
                      </p>
                    </div>
                  )}
                  {r.rejection_reason && (
                    <div className="mt-3 bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
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
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
