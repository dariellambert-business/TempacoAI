"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Loader2,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Palette,
  Calendar,
  FileText,
  CheckCircle2,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-400/15 text-blue-400 border-blue-400/25",
  contacted: "bg-amber-400/15 text-amber-400 border-amber-400/25",
  converted: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25",
  rejected: "bg-red-400/15 text-red-400 border-red-400/25",
};

const leadStatusLabels: Record<string, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  converted: "Dikonversi",
  rejected: "Ditolak",
};

interface LeadModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdated: () => void;
}

export function LeadModal({ lead, onClose, onUpdated }: LeadModalProps) {
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [convertSuccess, setConvertSuccess] = useState(false);

  async function updateStatus(status: string) {
    setUpdatingStatus(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (err) setError(err.message);
    else onUpdated();
    setUpdatingStatus(false);
  }

  async function convertToClient() {
    setConverting(true);
    setError("");
    const supabase = createClient();

    try {
      // 1. Create client record in standalone clients table
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          nama: lead.nama,
          kontak: lead.kontak,
          whatsapp: lead.whatsapp,
          kota: lead.kota,
          bidang_usaha: lead.bidang_usaha,
          deskripsi_bisnis: lead.deskripsi_bisnis,
          lead_id: lead.id,
          status: "active",
        })
        .select()
        .single();

      if (clientError) throw new Error(`Client: ${clientError.message}`);

      // 2. Create project with all website spec fields from lead
      const projectName = lead.jenis_website
        ? `Website ${lead.jenis_website} — ${lead.nama}`
        : `Project — ${lead.nama}`;

      const descParts = [
        lead.deskripsi_bisnis && `Bisnis: ${lead.deskripsi_bisnis}`,
        lead.usp && `USP: ${lead.usp}`,
        lead.fitur?.length && `Fitur: ${lead.fitur.join(", ")}`,
        lead.catatan && `Catatan: ${lead.catatan}`,
      ].filter(Boolean);

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: descParts.join("\n"),
          client_id: newClient.id,
          status: "active",
          start_date: new Date().toISOString().split("T")[0],
          end_date: lead.deadline || null,
          lead_id: lead.id,
          // Website spec fields
          jenis_website: lead.jenis_website,
          mood_desain: lead.mood_desain,
          warna_brand: lead.warna_brand,
          status_logo: lead.status_logo,
          link_referensi: lead.link_referensi,
          budget_tier: lead.budget_tier,
          tujuan_utama: lead.tujuan_utama,
          halaman_section: lead.halaman_section,
          kesiapan_konten: lead.kesiapan_konten,
          status_domain: lead.status_domain,
          status_hosting: lead.status_hosting,
          usp: lead.usp,
          catatan: lead.catatan,
        })
        .select()
        .single();

      if (projectError) throw new Error(`Project: ${projectError.message}`);

      // 3. Log activity
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.from("activity_log").insert({
        project_id: newProject.id,
        actor_id: session?.user?.id ?? null,
        action: "create",
        details: `Project dibuat dari lead "${lead.nama}"`,
      });

      // 4. Mark lead as converted, pointing to new clients table
      await supabase
        .from("leads")
        .update({
          status: "converted",
          converted_to_client_id: newClient.id,
          converted_to_project_id: newProject.id,
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      setConvertSuccess(true);
      setTimeout(() => onUpdated(), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal convert lead");
    }
    setConverting(false);
  }

  const isConverted = lead.status === "converted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-card-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{lead.nama}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${leadStatusColors[lead.status] ?? "bg-gray-400/15 text-gray-400"}`}
              >
                {leadStatusLabels[lead.status] ?? lead.status}
              </span>
              <span className="text-xs text-muted">
                {new Date(lead.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {convertSuccess && (
            <div className="bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Lead berhasil dikonversi! Client & project dibuat.
            </div>
          )}

          {/* Contact Info */}
          <Section title="Kontak" icon={<Phone size={16} />}>
            <InfoRow label="WhatsApp" value={lead.whatsapp} isLink={lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}` : undefined} />
            <InfoRow label="Kontak" value={lead.kontak} />
            <InfoRow label="Kota" value={lead.kota} icon={<MapPin size={14} />} />
          </Section>

          {/* Website Info */}
          <Section title="Website" icon={<Globe size={16} />}>
            <InfoRow label="Jenis" value={lead.jenis_website} />
            {lead.jenis_website_lainnya && (
              <InfoRow label="Detail" value={lead.jenis_website_lainnya} />
            )}
            <InfoRow label="Tujuan" value={lead.tujuan_utama} />
            <InfoRow label="Halaman" value={lead.halaman_section} />
            {lead.fitur?.length ? (
              <div className="py-2">
                <span className="text-xs text-muted">Fitur</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {lead.fitur.map((f, i) => (
                    <span
                      key={i}
                      className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Section>

          {/* Business Info */}
          <Section title="Bisnis" icon={<Briefcase size={16} />}>
            <InfoRow label="Bidang Usaha" value={lead.bidang_usaha} />
            <InfoRow label="Deskripsi" value={lead.deskripsi_bisnis} />
            <InfoRow label="USP" value={lead.usp} />
          </Section>

          {/* Design & Content */}
          <Section title="Desain & Konten" icon={<Palette size={16} />}>
            <InfoRow label="Mood Desain" value={lead.mood_desain} />
            <InfoRow label="Warna Brand" value={lead.warna_brand} />
            <InfoRow label="Logo" value={lead.status_logo} />
            <InfoRow label="Referensi" value={lead.link_referensi} isLink={lead.link_referensi || undefined} />
            <InfoRow label="Kesiapan Konten" value={lead.kesiapan_konten} />
          </Section>

          {/* Budget & Timeline */}
          <Section title="Budget & Timeline" icon={<Calendar size={16} />}>
            <InfoRow label="Budget" value={lead.budget_tier} />
            <InfoRow
              label="Deadline"
              value={
                lead.deadline
                  ? new Date(lead.deadline).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null
              }
            />
            <InfoRow label="Domain" value={lead.status_domain} />
            <InfoRow label="Hosting" value={lead.status_hosting} />
          </Section>

          {/* Notes */}
          {lead.catatan && (
            <Section title="Catatan" icon={<FileText size={16} />}>
              <p className="text-sm text-foreground whitespace-pre-wrap">{lead.catatan}</p>
            </Section>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-card-border">
            {!isConverted && lead.status !== "rejected" && (
              <>
                {lead.status === "new" && (
                  <button
                    onClick={() => updateStatus("contacted")}
                    disabled={updatingStatus}
                    className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <MessageSquare size={14} />
                    Tandai Dihubungi
                  </button>
                )}
                <button
                  onClick={convertToClient}
                  disabled={converting}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {converting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  Convert ke Client & Project
                </button>
                <button
                  onClick={() => updateStatus("rejected")}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Tolak
                </button>
              </>
            )}
            {lead.whatsapp && (
              <a
                href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Phone size={14} />
                Chat WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
        <span className="text-muted">{icon}</span>
        {title}
      </div>
      <div className="bg-foreground/5 rounded-lg px-4 py-1 divide-y divide-foreground/10">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  isLink,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  isLink?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2 gap-4">
      <span className="text-xs text-muted shrink-0 flex items-center gap-1">
        {icon}
        {label}
      </span>
      {isLink ? (
        <a
          href={isLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:underline text-right"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-foreground text-right">{value}</span>
      )}
    </div>
  );
}
