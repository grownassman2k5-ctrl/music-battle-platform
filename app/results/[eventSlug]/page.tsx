import { PersistedResultsBattlePage } from "@/components/prototype/persisted-battle-pages";

export default async function PersistedResultsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return <PersistedResultsBattlePage eventSlug={eventSlug} />;
}
