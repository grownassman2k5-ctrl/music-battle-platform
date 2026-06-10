import type { Metadata } from "next";
import { AdminCallbackPage } from "@/components/admin/admin-callback-page";

export const metadata: Metadata = {
  title: "Admin Auth Callback | Music Battle",
};

export default function Page() {
  return <AdminCallbackPage />;
}
