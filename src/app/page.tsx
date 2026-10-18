"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-bold text-white text-lg">
            T
          </div>
          <span className="text-xl font-semibold">Tempa Co</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Selamat datang, {user.email?.split("@")[0]} 👋
        </h1>
        <p className="text-muted mb-8">
          Dashboard sedang dalam pengembangan.
        </p>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-lg bg-input-bg border border-input-border hover:border-[#333] text-sm transition-colors"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
