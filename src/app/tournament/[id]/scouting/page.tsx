import { createClient } from "@/lib/supabase/server";
import { ScoutingTable } from "./scouting-table";

interface ScoutingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScoutingPage({ params }: ScoutingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(*)")
    .eq("tournament_id", id)
    .order("created_at");

  const { data: playerValues } = await supabase
    .from("draft_player_values")
    .select("*")
    .eq("tournament_id", id);

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("min_player_value, max_player_value")
    .eq("id", id)
    .single();

  // Get which players are already drafted
  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("user_id")
    .eq("tournament_id", id);

  const draftedUserIds = new Set(draftPicks?.map((p) => p.user_id) ?? []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Player Scouting</h2>
      <ScoutingTable
        registrations={registrations ?? []}
        playerValues={playerValues ?? []}
        draftedUserIds={draftedUserIds}
        minValue={tournament?.min_player_value ?? 0}
        maxValue={tournament?.max_player_value ?? 7}
      />
    </div>
  );
}
