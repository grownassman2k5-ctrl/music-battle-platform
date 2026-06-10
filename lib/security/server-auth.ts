import "server-only";

import type { User } from "@supabase/supabase-js";
import { extractBearerToken } from "@/lib/security/server-tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type VerifiedAdminUser =
  | {
      accessToken: string;
      error: "";
      user: User;
      verified: true;
    }
  | {
      accessToken: "";
      error: string;
      user: null;
      verified: false;
    };

export async function verifySupabaseAdminUser(
  request: Request,
): Promise<VerifiedAdminUser> {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    return {
      accessToken: "",
      error: "Sign in with Supabase Auth before using admin features.",
      user: null,
      verified: false,
    };
  }

  const { data, error } = await createSupabaseServerClient().auth.getUser(
    accessToken,
  );

  if (error || !data.user) {
    return {
      accessToken: "",
      error: "Admin session expired. Sign in again.",
      user: null,
      verified: false,
    };
  }

  return {
    accessToken,
    error: "",
    user: data.user,
    verified: true,
  };
}
