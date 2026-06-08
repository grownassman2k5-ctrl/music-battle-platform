import type { Metadata } from "next";
import { DeploymentDebugPage } from "@/components/debug/deployment-debug-page";

export const metadata: Metadata = {
  title: "Deployment Readiness | Music Battle Platform",
  description: "Checks deployment readiness without exposing secrets.",
};

export default function DeploymentDebugRoute() {
  return <DeploymentDebugPage />;
}
