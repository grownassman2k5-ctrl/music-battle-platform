"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import { clearStoredAdminAccessToken } from "@/lib/admin-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function AdminLogoutPage() {
  const [message, setMessage] = useState("Signing out...");

  useEffect(() => {
    let isActive = true;

    async function signOut() {
      clearStoredAdminAccessToken();
      const { error } = await getSupabaseBrowserClient().auth.signOut();

      if (isActive) {
        setMessage(error ? error.message : "Signed out and admin access cleared.");
      }
    }

    void signOut();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientMusicBackground density="calm" />
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        <Panel className="w-full p-6">
          <Link
            className="text-sm font-semibold text-zinc-400 transition hover:text-white"
            href="/"
          >
            Back to landing
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#43d9cf]">
                Admin logout
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                Organizer signed out
              </h1>
            </div>
            <Pill tone="neutral">Auth cleared</Pill>
          </div>
          <p className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-zinc-300">
            {message}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PreviewLink href="/admin/login" tone="primary">
              Sign In Again
            </PreviewLink>
            <PreviewLink href="/" tone="ghost">
              Landing Page
            </PreviewLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}
