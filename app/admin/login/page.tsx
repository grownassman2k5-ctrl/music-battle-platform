import type { Metadata } from "next";
import { AdminLoginPage } from "@/components/admin/admin-login-page";

export const metadata: Metadata = {
  title: "Admin Login | Music Battle",
};

export default function Page() {
  return <AdminLoginPage />;
}
