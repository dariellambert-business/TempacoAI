"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Plus, FileText } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

const statusColors: Record<string, string> = {
  draft: "bg-gray-400/10 text-gray-400",
  sent: "bg-blue-400/10 text-blue-400",
  paid: "bg-emerald-400/10 text-emerald-400",
  overdue: "bg-red-400/10 text-red-400",
  cancelled: "bg-gray-400/10 text-gray-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Terkirim",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
  cancelled: "Dibatalkan",
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const supabase = createClient();
      let q = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("client_id", user!.id);
      const { data } = await q;
      setInvoices(data ?? []);
      setLoading(false);
    }
    load();
  }, [user, isAdmin]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <FileText size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada invoice</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">
                    {inv.invoice_number}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span className="text-base font-bold text-white">
                      {formatIDR(inv.amount)}
                    </span>
                    {inv.due_date && (
                      <span>
                        Jatuh tempo:{" "}
                        {new Date(inv.due_date).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                  {inv.notes && (
                    <p className="text-sm text-muted mt-2 truncate">
                      {inv.notes}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] ?? "bg-white/10 text-muted"}`}
                >
                  {statusLabels[inv.status] ?? inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
