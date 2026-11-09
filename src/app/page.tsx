"use client";

import { useAuth } from "@/components/AuthProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useClientRecord } from "@/hooks/useClientRecord";
import { createClient } from "@/lib/supabase/client";
import {
  FolderKanban,
  FileText,
  MessageSquare,
  Clock,
  Loader2,
  TrendingUp,
  Globe,
  ExternalLink,
  ClipboardEdit,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────

type Stats = {
  activeProjects: number;
  pendingInvoices: number;
  unreadMessages: number;
  totalProjects: number;
};

type ChartData = {
  projectsByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  monthlyProjects: { month: string; count: number }[];
  monthlyRevenue: { month: string; amount: number }[];
  sparklines: {
    projects: number[];
    invoices: number[];
    messages: number[];
  };
};

type Activity = {
  id: string;
  type: "project" | "invoice" | "message";
  text: string;
  time: string;
};

type ClientProject = {
  id: string;
  name: string;
  status: string;
  site_url: string | null;
  start_date: string | null;
  end_date: string | null;
  progress: number | null;
};

type ClientInvoice = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
};

type ClientEditRequest = {
  id: string;
  type: string;
  status: string;
  description: string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────

function getWeeklyBuckets(items: { created_at: string }[], weeks = 8): number[] {
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const buckets = new Array(weeks).fill(0);
  items.forEach((item) => {
    const age = now - new Date(item.created_at).getTime();
    const weekIdx = Math.floor(age / msPerWeek);
    if (weekIdx >= 0 && weekIdx < weeks) {
      buckets[weeks - 1 - weekIdx]++;
    }
  });
  return buckets;
}

function getMonthlyBuckets(items: { created_at: string; amount?: number }[], months = 6) {
  const result: { month: string; count: number; amount: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("id-ID", { month: "short" });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const matching = items.filter((item) => item.created_at.startsWith(yearMonth));
    result.push({
      month: label,
      count: matching.length,
      amount: matching.reduce((sum, m) => sum + ((m as { amount?: number }).amount ?? 0), 0),
    });
  }
  return result;
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

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

const projectStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Dalam Pengerjaan", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  on_hold: { label: "Ditunda", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  completed: { label: "Live", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  cancelled: { label: "Dibatalkan", color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" },
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

const editStatusLabels: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  rejected: "Ditolak",
};

const editStatusColors: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-400",
  in_progress: "bg-blue-400/10 text-blue-400",
  completed: "bg-emerald-400/10 text-emerald-400",
  rejected: "bg-red-400/10 text-red-400",
};

// ─── Admin Dashboard Data Hook ────────────────────────────────

function useDashboardData(userId: string | undefined | null, isAdmin: boolean, clientId: string | null) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    if (!isAdmin && !clientId) return;

    async function fetchData() {
      try {
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

        if (!isAdmin && clientId) {
          projectsQ = projectsQ.eq("client_id", clientId);
          invoicesQ = invoicesQ.eq("client_id", clientId);
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

        const projectsByStatus: Record<string, number> = {};
        projects.forEach((p) => {
          projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
        });

        const invoicesByStatus: Record<string, number> = {};
        invoices.forEach((i) => {
          invoicesByStatus[i.status] = (invoicesByStatus[i.status] || 0) + 1;
        });

        const monthlyData = getMonthlyBuckets(projects);
        const monthlyRevData = getMonthlyBuckets(
          invoices.map((i) => ({ created_at: i.created_at, amount: i.amount }))
        );

        setChartData({
          projectsByStatus,
          invoicesByStatus,
          monthlyProjects: monthlyData.map((m) => ({ month: m.month, count: m.count })),
          monthlyRevenue: monthlyRevData.map((m) => ({ month: m.month, amount: m.amount })),
          sparklines: {
            projects: getWeeklyBuckets(projects),
            invoices: getWeeklyBuckets(invoices),
            messages: getWeeklyBuckets(messages),
          },
        });

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
          const amount = formatIDR(i.amount);
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
      } catch {
        // Queries failed — show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, isAdmin, clientId]);

  return { stats, chartData, activities, loading };
}

// ─── Client Dashboard Data Hook ───────────────────────────────

function useClientDashboard(clientId: string | null) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [editRequests, setEditRequests] = useState<ClientEditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    async function load() {
      const supabase = createClient();

      const [projRes, invRes, reqRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, status, site_url, start_date, end_date, progress")
          .eq("client_id", clientId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, invoice_number, amount, status, due_date")
          .eq("client_id", clientId!)
          .in("status", ["sent", "overdue"])
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("edit_requests")
          .select("id, type, status, description, created_at")
          .eq("client_id", clientId!)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // @ts-ignore - safe cast
      setProjects((projRes.data as ClientProject[]) ?? []);
      // @ts-ignore - safe cast
      setInvoices((invRes.data as ClientInvoice[]) ?? []);
      // @ts-ignore - safe cast
      setEditRequests((reqRes.data as ClientEditRequest[]) ?? []);
      setLoading(false);
    }

    load();
  }, [clientId]);

  return { projects, invoices, editRequests, loading };
}

// ─── SVG Components ────────────────────────────────────────────

function Sparkline({ data, color = "#6366f1", width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data.length || data.every((d) => d === 0)) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const padding = 2;
  const h = height - padding * 2;
  const step = (width - padding * 2) / (data.length - 1);
  const points = data.map((v, i) => `${padding + i * step},${padding + h - (v / max) * h}`).join(" ");
  const areaPoints = `${padding},${padding + h} ${points} ${padding + (data.length - 1) * step},${padding + h}`;
  return (
    <svg width={width} height={height}>
      <polygon points={areaPoints} fill={color} fillOpacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRing({ value, total, color, label, size = 100 }: { value: number; total: number; color: string; label: string; size?: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-white/5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="text-center -mt-[68px] mb-6">
        <p className="text-xl font-bold">{pct}%</p>
        <p className="text-[10px] text-muted">{value}/{total}</p>
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color = "#6366f1", height = 140 }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string; color?: string; height?: number }) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const labels = data.map((d) => String(d[labelKey]));
  const max = Math.max(...values, 1);
  const barWidth = Math.min(32, Math.floor((280 - (data.length - 1) * 6) / data.length));
  const totalWidth = data.length * barWidth + (data.length - 1) * 6;

  return (
    <div className="flex flex-col items-center">
      <svg width={totalWidth + 20} height={height + 30} className="overflow-visible">
        {[0, 0.5, 1].map((frac) => (
          <line
            key={frac}
            x1={10}
            y1={10 + (1 - frac) * height}
            x2={totalWidth + 10}
            y2={10 + (1 - frac) * height}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-white/5"
          />
        ))}
        {values.map((v, i) => {
          const barH = (v / max) * height;
          const x = 10 + i * (barWidth + 6);
          return (
            <g key={i}>
              <rect
                x={x}
                y={10 + height - barH}
                width={barWidth}
                height={barH}
                rx={3}
                fill={color}
                fillOpacity={0.85}
              />
              {v > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={10 + height - barH - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill={color}
                  fontWeight={600}
                >
                  {v}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 24}
                textAnchor="middle"
                fontSize={9}
                className="fill-current text-muted"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Config ────────────────────────────────────────────────────

const sparklineColors: Record<string, string> = {
  activeProjects: "#6366f1",
  pendingInvoices: "#f59e0b",
  unreadMessages: "#10b981",
  totalProjects: "#06b6d4",
};

const statConfig = [
  { key: "activeProjects" as const, label: "Active Projects", icon: FolderKanban, color: "text-accent", sparkKey: "projects" as const },
  { key: "pendingInvoices" as const, label: "Pending Invoices", icon: FileText, color: "text-amber-400", sparkKey: "invoices" as const },
  { key: "unreadMessages" as const, label: "Unread Messages", icon: MessageSquare, color: "text-emerald-400", sparkKey: "messages" as const },
  { key: "totalProjects" as const, label: "Total Projects", icon: Clock, color: "text-cyan-400", sparkKey: "projects" as const },
];

const activityIcons = {
  project: FolderKanban,
  invoice: FileText,
  message: MessageSquare,
};

// ─── Client Dashboard Component ───────────────────────────────

function ClientDashboard({ name, clientId }: { name: string; clientId: string }) {
  const { projects, invoices, editRequests, loading } = useClientDashboard(clientId);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const totalUnpaid = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Halo, {name} 👋</h1>
        <p className="text-muted text-sm">
          Berikut ringkasan project & tagihan kamu.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-blue-400 bg-blue-400/10 p-1.5 rounded-lg">
              <FolderKanban size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold">{activeProjects.length}</p>
          <p className="text-[11px] text-muted">Project Aktif</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-emerald-400 bg-emerald-400/10 p-1.5 rounded-lg">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold">{completedProjects.length}</p>
          <p className="text-[11px] text-muted">Website Live</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-amber-400 bg-amber-400/10 p-1.5 rounded-lg">
              <Receipt size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold">{invoices.length}</p>
          <p className="text-[11px] text-muted">Tagihan Pending</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-cyan-400 bg-cyan-400/10 p-1.5 rounded-lg">
              <ClipboardEdit size={14} />
            </div>
          </div>
          <p className="text-2xl font-bold">
            {editRequests.filter((r) => r.status !== "completed" && r.status !== "rejected").length}
          </p>
          <p className="text-[11px] text-muted">Request Aktif</p>
        </div>
      </div>

      {/* Project cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Project Kamu</h2>
          <a
            href="/projects"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight size={12} />
          </a>
        </div>
        {projects.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">
            <FolderKanban size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p) => {
              const cfg = projectStatusConfig[p.status] ?? projectStatusConfig.active;
              const progress = p.progress ?? 0;
              return (
                <a
                  key={p.id}
                  href="/projects"
                  className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors block"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-foreground truncate">
                      {p.name}
                    </h3>
                    <span
                      className={`shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Website link */}
                  {p.site_url && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(p.site_url!, "_blank");
                      }}
                      className="flex items-center gap-2 text-xs text-accent hover:underline cursor-pointer"
                    >
                      <Globe size={12} />
                      <span className="truncate">{p.site_url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={10} className="shrink-0" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invoices */}
      {invoices.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tagihan Belum Dibayar</h2>
            <a
              href="/invoices"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </a>
          </div>
          <div className="bg-card border border-card-border rounded-xl divide-y divide-card-border">
            {/* Total bar */}
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-muted">Total belum dibayar</span>
              <span className="text-lg font-bold text-foreground">
                {formatIDR(totalUnpaid)}
              </span>
            </div>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {inv.invoice_number}
                    </span>
                    {inv.status === "overdue" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 flex items-center gap-0.5">
                        <AlertTriangle size={9} /> Jatuh Tempo
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatIDR(inv.amount)}</p>
                  {inv.due_date && (
                    <p className="text-[10px] text-muted">
                      {new Date(inv.due_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent edit requests */}
      {editRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Request Terbaru</h2>
            <a
              href="/edit-requests"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </a>
          </div>
          <div className="space-y-2">
            {editRequests.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-card-border rounded-xl px-5 py-3 flex items-center gap-3"
              >
                <ClipboardEdit size={14} className="text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                      {editTypeLabels[r.type] ?? r.type}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${editStatusColors[r.status] ?? "bg-white/10 text-muted"}`}
                    >
                      {editStatusLabels[r.status] ?? r.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 truncate">
                    {r.description}
                  </p>
                </div>
                <span className="text-[10px] text-muted shrink-0">
                  {timeAgo(r.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Admin Dashboard Component ────────────────────────────────

function AdminDashboard({ name, userId, clientId }: { name: string; userId: string; clientId: string | null }) {
  const { stats, chartData, activities, loading } = useDashboardData(userId, true, clientId);

  const completedProjects = chartData?.projectsByStatus?.["completed"] ?? 0;
  const totalProjects = stats?.totalProjects ?? 0;
  const paidInvoices = chartData?.invoicesByStatus?.["paid"] ?? 0;
  const totalInvoices = Object.values(chartData?.invoicesByStatus ?? {}).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Selamat datang, {name} 👋
        </h1>
        <p className="text-muted text-sm">
          Pantau project, invoice, dan komunikasi kamu di sini.
        </p>
      </div>

      {/* Stat cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statConfig.map((s) => (
          <div
            key={s.key}
            className="bg-card border border-card-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${s.color} bg-white/5 p-2 rounded-lg`}>
                <s.icon size={18} />
              </div>
              {!loading && chartData && (
                <Sparkline
                  data={chartData.sparklines[s.sparkKey]}
                  color={sparklineColors[s.key]}
                />
              )}
            </div>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 size={20} className="animate-spin text-muted" />
              ) : (
                stats?.[s.key] ?? 0
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" />
            Completion Rate
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : (
            <div className="flex justify-around">
              <ProgressRing
                value={completedProjects}
                total={totalProjects}
                color="#6366f1"
                label="Projects"
              />
              <ProgressRing
                value={paidInvoices}
                total={totalInvoices}
                color="#10b981"
                label="Invoices"
              />
            </div>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <FolderKanban size={14} className="text-accent" />
            Project &amp; Invoice — 6 Bulan Terakhir
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="text-center">
                <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">Projects</p>
                <BarChart
                  data={chartData?.monthlyProjects ?? []}
                  labelKey="month"
                  valueKey="count"
                  color="#6366f1"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">Invoices</p>
                <BarChart
                  data={chartData?.monthlyRevenue ?? []}
                  labelKey="month"
                  valueKey="amount"
                  color="#10b981"
                />
              </div>
            </div>
          )}
        </div>
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
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function Home() {
  const { user, profile, isAdmin } = useAuth();
  const { client } = useClientRecord(!isAdmin ? user?.id : null);
  const name = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <DashboardLayout>
      {isAdmin ? (
        <AdminDashboard name={name} userId={user?.id ?? ""} clientId={client?.id ?? null} />
      ) : (
        <ClientDashboard name={name} clientId={client?.id ?? ""} />
      )}
    </DashboardLayout>
  );
}
