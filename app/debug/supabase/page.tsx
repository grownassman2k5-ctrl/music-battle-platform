import type { Metadata } from "next";
import { SupabaseDebugPage } from "@/components/debug/supabase-debug-page";

export const metadata: Metadata = {
  title: "Supabase Debug | Music Battle Platform",
  description: "Checks local Supabase environment variable readiness.",
};

export default function SupabaseDebugRoute() {
  return <SupabaseDebugPage />;
}
