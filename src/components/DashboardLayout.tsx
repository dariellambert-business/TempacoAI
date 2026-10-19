"use client";

import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-50 h-screen bg-card border-r border-card-border
            flex flex-col transition-all duration-200
            ${collapsed ? "w-[68px]" : "w-60"}
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 border-b border-card-border shrink-0">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center font-bold text-white text-sm shrink-0">
              T
            </div>
            {!collapsed && (
              <span className="text-base font-semibold text-white truncate">
                Tempa Co
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = currentPath === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <item.icon size={20} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </a>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-card-border p-3 space-y-2">
            {/* User */}
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <span className="text-sm text-muted truncate">
                  {user?.email}
                </span>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-400/5 transition-colors"
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span>Keluar</span>}
            </button>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-full py-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft
                size={18}
                className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Top bar (mobile) */}
          <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-card-border bg-card">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-muted hover:text-white"
            >
              <Menu size={22} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white text-xs">
              T
            </div>
            <span className="text-sm font-semibold">Tempa Co</span>
          </div>

          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
