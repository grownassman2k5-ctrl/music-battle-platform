"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnvironment = {
  supabaseUrl: string;
  publishableKey: string;
};

export type SupabaseConnectionCheck = {
  hasUrl: boolean;
  hasPublishableKey: boolean;
  canCreateClient: boolean;
  message: string;
};

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  const { publishableKey, supabaseUrl } = getSupabaseEnvironment();

  validateSupabaseUrl(supabaseUrl);

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export function getSupabaseBrowserClient() {
  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}

export function getSupabaseConnectionCheck(): SupabaseConnectionCheck {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const hasUrl = Boolean(supabaseUrl);
  const hasPublishableKey = Boolean(publishableKey);

  if (!hasUrl || !hasPublishableKey) {
    return {
      hasUrl,
      hasPublishableKey,
      canCreateClient: false,
      message: "Add both public Supabase environment variables.",
    };
  }

  try {
    getSupabaseBrowserClient();

    return {
      hasUrl,
      hasPublishableKey,
      canCreateClient: true,
      message: "Supabase browser client can be created.",
    };
  } catch {
    return {
      hasUrl,
      hasPublishableKey,
      canCreateClient: false,
      message: "Supabase client could not be created. Check the URL format.",
    };
  }
}

function getSupabaseEnvironment(): SupabaseEnvironment {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing public Supabase environment variables.");
  }

  return {
    supabaseUrl,
    publishableKey,
  };
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
}

function validateSupabaseUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("Supabase URL must use https.");
  }
}
