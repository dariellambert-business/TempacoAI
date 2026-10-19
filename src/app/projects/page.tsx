"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Plus, FolderKanban } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

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

export default function ProjectsPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const supabase = createClient();
      let q = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("client_id", user!.id);
      const { data } = await q;
      setProjects(data ?? []);
      setLoading(false);
    }
    load();
  }, [user, isAdmin]);

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

      {loading ? (
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
              className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                    {p.start_date && (
                      <span>
                        Mulai:{" "}
                        {new Date(p.start_date).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    {p.end_date && (
                      <span>
                        Selesai:{" "}
                        {new Date(p.end_date).toLocaleDateString("id-ID")}
                      </span>
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
