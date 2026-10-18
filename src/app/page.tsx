import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
          Selamat datang 👋
        </h1>
        <p className="text-muted mb-8">
          Dashboard sedang dalam pengembangan.
        </p>
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-input-bg border border-input-border hover:border-[#333] text-sm transition-colors"
          >
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}
