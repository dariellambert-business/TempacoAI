"use client";

import { useAuth } from "@/components/AuthProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { FolderKanban, FileText, MessageSquare, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Stats = {
  activeProjects: number;
  pendingInvoices: number;
  unreadMessages: number;
  totalProjects: number;
};

type Activity = {
  id: string;
  type: "project" | "invoice" | "message";
  text: string;
  time: string;
};

function useDashboardData(userId: string | undefined | null, isAdmin: boolean) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      const supabase = createClient();

      let projectsQ = supabase
        .from("projects")
        .select("id, name, status, created_at");
      let invoicesQ = supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, created_at");
      const messagesQ = supabase
        .from("messages")
        .select("id, body, is_read, created_at, project_id")
        .eq("is_read", false);

      if (!isAdmin) {
        projectsQ = projectsQ.eq("client_id", userId!);
        invoicesQ = invoicesQ.eq("client_id", userId!);
      }

      const [projectsRes, invoicesRes, messagesRes] = await Promise.all([
        projectsQ,
        invoicesQ,
        messagesQ,
      ]);

      const projects = projectsRes.data ?? [];
      const invoices = invoicesRes.data ?? [];
      const messages = messagesRes.data ?? [];

      setStats({
        activeProjects: projects.filter((p) => p.status === "active").length,
        pendingInvoices: invoices.filter((i) => i.status === "sent" || i.status === "overdue").length,
        unreadMessages: messages.length,
        totalProjects: projects.length,
      });

      // Build recent activity from all sources
      const recentActivities: Activity[] = [];

      projects.slice(0, 5).forEach((p) => {
        recentActivities.push({
          id: p.id,
          type: "project",
          text: `Project "${p.name}" — ${p.status}`,
          time: p.created_at,
        });
      });

      invoices.slice(0, 5).forEach((i) => {
        const amount = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(i.amount);
        recentActivities.push({
          id: i.id,
          type: "invoice",
          text: `Invoice ${i.invoice_number} — ${amount} (${i.status})`,
          time: i.created_at,
        });
      });

      recentActivities.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setActivities(recentActivities.slice(0, 8));
      setLoading(false);
    }

    fetchData();
  }, [userId]);

  return { stats, activities, loading };
}

const statConfig = [
  { key: "activeProjects" as const, label: "Active Projects", icon: FolderKanban, color: "text-accent" },
  { key: "pendingInvoices" as const, label: "Pending Invoices", icon: FileText, color: "text-amber-400" },
  { key: "unreadMessages" as const, label: "Unread Messages", icon: MessageSquare, color: "text-emerald-400" },
  { key: "totalProjects" as const, label: "Total Projects", icon: Clock, color: "text-cyan-400" },
];

const activityIcons = {
  project: FolderKanban,
  invoice: FileText,
  message: MessageSquare,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function Home() {
  const { user, profile, isAdmin } = useAuth();
  const { stats, activities, loading } = useDashboardData(user?.id, isAdmin);
  const name = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Selamat datang, {name} 👋
        </h1>
        <p className="text-muted text-sm">
          Pantau project, invoice, dan komunikasi kamu di sini.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statConfig.map((s) => (
          <div
            key={s.key}
            className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`${s.color} bg-white/5 p-2.5 rounded-lg`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-muted" />
                ) : (
                  stats?.[s.key] ?? 0
                )}
              </p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Aktivitas Terbaru</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-muted" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Clock size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Belum ada aktivitas</p>
            <p className="text-xs mt-1">
              Aktivitas project dan invoice akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => {
              const Icon = activityIcons[a.type];
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Icon size={16} className="text-muted shrink-0" />
                  <span className="text-sm flex-1 truncate">{a.text}</span>
                  <span className="text-xs text-muted shrink-0">
                    {timeAgo(a.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
