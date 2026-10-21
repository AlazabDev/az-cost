import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Project {
  id: string;
  name: string;
  type: string;
  location: string | null;
  status: string;
  created_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  amount: number;
  direction: string;
  category: string;
  vendor: string | null;
  notes: string | null;
  receipt_path: string | null;
  spent_at: string;
  created_at: string;
}

/** Loads the signed-in user's projects and expenses, with a refetch. */
export function useData() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [p, e] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("spent_at", { ascending: false }),
    ]);
    setProjects((p.data as Project[]) ?? []);
    setExpenses((e.data as Expense[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { projects, expenses, loading, refetch };
}
