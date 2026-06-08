import { PersistedHostBattlePage } from "@/components/prototype/persisted-battle-pages";

export default async function PersistedHostPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;

  return <PersistedHostBattlePage eventSlug={eventSlug} />;
}
