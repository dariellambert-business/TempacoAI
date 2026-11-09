"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { useClientRecord } from "@/hooks/useClientRecord";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

const statusColors: Record<string, string> = {
  draft: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  sent: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  paid: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  overdue: "bg-red-400/10 text-red-400 border-red-400/20",
  cancelled: "bg-gray-400/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Terkirim",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
  cancelled: "Dibatalkan",
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  overdue: AlertTriangle,
  sent: Clock,
  draft: FileText,
  cancelled: FileText,
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function InvoicesPage() {
  const { user, isAdmin } = useAuth();
  const { client, loading: clientLoading } = useClientRecord(
    !isAdmin ? user?.id : null
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    if (!isAdmin && !client) return;

    async function load() {
      const supabase = createClient();
      let q = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin && client) q = q.eq("client_id", client.id);
      const { data } = await q;
      // @ts-ignore - safe cast
      setInvoices((data as Invoice[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user, isAdmin, client]);

  const filtered =
    filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  // Summary stats
  const totalUnpaid = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted mt-1">
            Riwayat tagihan & pembayaran
          </p>
        </div>
        {isAdmin && (
          <a
            href="/admin?tab=new-invoice"
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Invoice Baru
          </a>
        )}
      </div>

      {/* Summary cards */}
      {!loading && !clientLoading && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={14} className="text-blue-400" />
              <span className="text-xs text-muted">Belum Dibayar</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatIDR(totalUnpaid)}
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-xs text-muted">Total Dibayar</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatIDR(totalPaid)}
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs text-muted">Jatuh Tempo</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {overdueCount} invoice
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && !clientLoading && invoices.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: "all", label: "Semua" },
            { value: "sent", label: "Terkirim" },
            { value: "overdue", label: "Jatuh Tempo" },
            { value: "paid", label: "Lunas" },
            { value: "cancelled", label: "Dibatalkan" },
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
              {f.value === "all" && ` (${invoices.length})`}
              {f.value !== "all" &&
                ` (${invoices.filter((i) => i.status === f.value).length})`}
            </button>
          ))}
        </div>
      )}

      {loading || clientLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <FileText size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada invoice</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const StatusIcon = statusIcons[inv.status] ?? FileText;
            return (
              <div
                key={inv.id}
                className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {inv.invoice_number}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${statusColors[inv.status] ?? "bg-white/10 text-muted"}`}
                      >
                        <StatusIcon size={10} />
                        {statusLabels[inv.status] ?? inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                      <span className="text-lg font-bold text-foreground">
                        {formatIDR(inv.amount)}
                      </span>
                      {inv.due_date && (
                        <span>
                          Jatuh tempo:{" "}
                          {new Date(inv.due_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {inv.notes && (
                      <p className="text-sm text-muted mt-2">{inv.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
