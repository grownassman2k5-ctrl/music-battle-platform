import type { Metadata } from "next";
import { AdminLogoutPage } from "@/components/admin/admin-logout-page";

export const metadata: Metadata = {
  title: "Admin Logout | Music Battle",
};

export default function Page() {
  return <AdminLogoutPage />;
}
