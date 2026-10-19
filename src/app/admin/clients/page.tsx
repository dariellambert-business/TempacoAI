"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Users, Mail, Phone, Building2 } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "client")
        .order("created_at", { ascending: false });
      setClients(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted">
          <p>Kamu tidak punya akses ke halaman ini.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted">
          Tambah client lewat Supabase Dashboard → Auth → Invite User
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <Users size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada client</p>
          <p className="text-xs mt-1">
            Invite user baru lewat Supabase Dashboard
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-card-border rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {(c.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {c.full_name || "Belum diisi"}
                  </p>
                  <p className="text-xs text-muted">
                    Bergabung{" "}
                    {new Date(c.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted">
                {c.company && (
                  <div className="flex items-center gap-2">
                    <Building2 size={14} />
                    <span>{c.company}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
