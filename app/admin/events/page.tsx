import type { Metadata } from "next";
import { EventAdminPage } from "@/components/admin/event-admin-page";

export const metadata: Metadata = {
  title: "Event Admin | Music Battle Platform",
  description: "Organizer dashboard for saved music battle events.",
};

export default function AdminEventsRoute() {
  return <EventAdminPage />;
}
