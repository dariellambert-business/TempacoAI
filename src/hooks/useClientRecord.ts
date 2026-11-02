"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

export function useClientRecord(userId: string | undefined | null) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("profile_id", userId!)
        .single();
      setClient(data ?? null);
      setLoading(false);
    }

    fetch();
  }, [userId]);

  return { client, loading };
}
