import type { Metadata } from "next";
import { SupabaseSchemaDebugPage } from "@/components/debug/supabase-schema-debug-page";

export const metadata: Metadata = {
  title: "Supabase Schema Setup | Music Battle Platform",
  description: "Manual Supabase schema setup checklist.",
};

export default function SupabaseSchemaDebugRoute() {
  return <SupabaseSchemaDebugPage />;
}
