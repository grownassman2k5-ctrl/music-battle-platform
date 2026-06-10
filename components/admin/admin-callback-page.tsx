"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type CallbackState =
  | {
      message: string;
      status: "checking";
    }
  | {
      message: string;
      status: "ready";
    }
  | {
      message: string;
      status: "error";
    };

export function AdminCallbackPage() {
  const [callbackState, setCallbackState] = useState<CallbackState>({
    message: "Completing Supabase Auth sign-in...",
    status: "checking",
  });

  useEffect(() => {
    let isActive = true;

    async function completeSignIn() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } =
          await getSupabaseBrowserClient().auth.exchangeCodeForSession(code);

        if (error) {
          if (isActive) {
            setCallbackState({
              message: error.message,
              status: "error",
            });
          }
          return;
        }
      }

      const { data, error } = await getSupabaseBrowserClient().auth.getSession();

      if (!isActive) {
        return;
      }

      if (error || !data.session) {
        setCallbackState({
          message: error?.message ?? "No admin session was found.",
          status: "error",
        });
        return;
      }

      setCallbackState({
        message: `Signed in as ${data.session.user.email ?? "admin user"}.`,
        status: "ready",
      });
    }

    void completeSignIn();

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
                Auth callback
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                Admin sign-in
              </h1>
            </div>
            <Pill
              tone={
                callbackState.status === "ready"
                  ? "cyan"
                  : callbackState.status === "error"
                    ? "rose"
                    : "gold"
              }
            >
              {callbackState.status}
            </Pill>
          </div>
          <p className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-zinc-300">
            {callbackState.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PreviewLink href="/admin/events" tone="primary">
              Continue to Admin
            </PreviewLink>
            <PreviewLink href="/admin/login" tone="ghost">
              Back to Login
            </PreviewLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}
