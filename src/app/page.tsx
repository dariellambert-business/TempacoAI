"use client";

import { useAuth } from "@/components/AuthProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FolderKanban, FileText, MessageSquare, Clock } from "lucide-react";

const stats = [
  { label: "Active Projects", value: "—", icon: FolderKanban, color: "text-accent" },
  { label: "Pending Invoices", value: "—", icon: FileText, color: "text-amber-400" },
  { label: "Unread Messages", value: "—", icon: MessageSquare, color: "text-emerald-400" },
  { label: "Hours Logged", value: "—", icon: Clock, color: "text-cyan-400" },
];

export default function Home() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "";

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
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`${s.color} bg-white/5 p-2.5 rounded-lg`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Aktivitas Terbaru</h2>
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Clock size={40} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada aktivitas</p>
          <p className="text-xs mt-1">
            Aktivitas project dan invoice akan muncul di sini
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
