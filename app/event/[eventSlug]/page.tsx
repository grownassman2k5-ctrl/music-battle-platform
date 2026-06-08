import { PersistedEventBattlePage } from "@/components/prototype/persisted-battle-pages";

export default async function PersistedEventPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return <PersistedEventBattlePage eventSlug={eventSlug} />;
}
