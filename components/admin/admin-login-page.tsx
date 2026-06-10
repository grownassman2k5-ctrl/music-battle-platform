"use client";

import Link from "next/link";
import { useState } from "react";
import { AmbientMusicBackground } from "@/components/prototype/ambient-music-background";
import { MockButton, Panel, Pill, PreviewLink } from "@/components/prototype/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type LoginState =
  | {
      message: string;
      status: "idle";
    }
  | {
      message: string;
      status: "sending";
    }
  | {
      message: string;
      status: "sent";
    }
  | {
      message: string;
      status: "error";
    };

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [loginState, setLoginState] = useState<LoginState>({
    message: "Enter the organizer email configured in Supabase Auth.",
    status: "idle",
  });
  const isSending = loginState.status === "sending";

  async function sendMagicLink() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLoginState({
        message: "Enter a valid email address.",
        status: "error",
      });
      return;
    }

    setLoginState({
      message: "Sending magic link...",
      status: "sending",
    });

    const redirectTo = `${window.location.origin}/admin/callback`;
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setLoginState({
        message: error.message,
        status: "error",
      });
      return;
    }

    setLoginState({
      message: "Magic link sent. Check your email, then return here.",
      status: "sent",
    });
  }

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
                Admin login
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                Sign in with Supabase Auth
              </h1>
            </div>
            <Pill tone="cyan">Magic link</Pill>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            This is for organizers only. Guests still join events with a
            passcode and display name.
          </p>
          <div className="mt-6 grid gap-4">
            <label>
              <span className="text-sm font-semibold text-zinc-200">
                Organizer email
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-white/15 bg-black/30 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#43d9cf]/70"
                disabled={isSending}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>
            <MockButton disabled={isSending} onClick={sendMagicLink} tone="primary">
              {isSending ? "Sending..." : "Send Magic Link"}
            </MockButton>
          </div>
          <p
            className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
              loginState.status === "error"
                ? "border-[#ff6b8a]/30 bg-[#ff6b8a]/10 text-[#ffe2e8]"
                : loginState.status === "sent"
                  ? "border-[#43d9cf]/30 bg-[#43d9cf]/10 text-[#cbfffb]"
                  : "border-white/10 bg-white/10 text-zinc-400"
            }`}
          >
            {loginState.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PreviewLink href="/admin/events" tone="ghost">
              Admin Dashboard
            </PreviewLink>
            <PreviewLink href="/debug/deployment" tone="ghost">
              Deployment Check
            </PreviewLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}
