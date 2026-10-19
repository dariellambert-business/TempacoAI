"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

export default function MessagesPage() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load projects
  useEffect(() => {
    if (!user) return;
    async function loadProjects() {
      const supabase = createClient();
      let q = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("client_id", user!.id);
      const { data } = await q;
      setProjects(data ?? []);
      if (data && data.length > 0) setSelectedProject(data[0].id);
      setLoading(false);
    }
    loadProjects();
  }, [user, isAdmin]);

  // Load messages for selected project
  useEffect(() => {
    if (!selectedProject) return;
    async function loadMessages() {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("project_id", selectedProject!)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);

      // Mark as read
      if (!isAdmin) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("project_id", selectedProject!)
          .neq("sender_id", user!.id);
      }
    }
    loadMessages();
  }, [selectedProject, user, isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedProject || !user) return;
    setSending(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .insert({
        project_id: selectedProject,
        sender_id: user.id,
        body: newMsg.trim(),
      })
      .select()
      .single();
    if (data) setMessages((prev) => [...prev, data]);
    setNewMsg("");
    setSending(false);
  }

  const selectedProjectName =
    projects.find((p) => p.id === selectedProject)?.name ?? "";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <MessageSquare size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Belum ada project untuk chat</p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Project list */}
          <div className="w-64 shrink-0 bg-card border border-card-border rounded-xl overflow-y-auto hidden md:block">
            <div className="p-3 border-b border-card-border">
              <p className="text-xs text-muted font-medium">Projects</p>
            </div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-card-border transition-colors ${
                  selectedProject === p.id
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Mobile project select */}
          <select
            className="md:hidden w-full mb-3 bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-white"
            value={selectedProject ?? ""}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Chat area */}
          <div className="flex-1 bg-card border border-card-border rounded-xl flex flex-col min-w-0">
            {/* Header */}
            <div className="px-5 py-3 border-b border-card-border">
              <p className="text-sm font-semibold text-white">
                {selectedProjectName}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted">
                  <MessageSquare size={32} className="opacity-40 mb-2" />
                  <p className="text-sm">Belum ada pesan</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine
                            ? "bg-accent text-white rounded-br-md"
                            : "bg-white/5 text-white rounded-bl-md"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p
                          className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-muted"}`}
                        >
                          {new Date(m.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={sendMessage}
              className="p-3 border-t border-card-border flex gap-2"
            >
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 bg-input-bg border border-input-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={sending || !newMsg.trim()}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
