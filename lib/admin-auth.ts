"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export async function getCurrentAdminSession() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();

  if (error || !data.session) {
    return {
      accessToken: "",
      email: "",
      error: error?.message ?? "No admin session found.",
      signedIn: false as const,
    };
  }

  return {
    accessToken: data.session.access_token,
    email: data.session.user.email ?? "",
    error: "",
    signedIn: true as const,
  };
}
