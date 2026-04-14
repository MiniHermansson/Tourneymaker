import { createClient } from "@/lib/supabase/server";
import { SubstitutesList } from "./substitutes-list";

interface SubstitutesPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubstitutesPage({ params }: SubstitutesPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get all registrations that opted in as substitute
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(*)")
    .eq("tournament_id", id)
    .eq("willing_substitute", true)
    .order("created_at");

  // Get player draft values
  const { data: playerValues } = await supabase
    .from("draft_player_values")
    .select("*")
    .eq("tournament_id", id);

  // Get all drafted players (those who were picked by a team)
  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("user_id")
    .eq("tournament_id", id);

  const draftedUserIds = new Set(draftPicks?.map((p) => p.user_id) ?? []);

  // Also get captains (they are not in draft pool either)
  const { data: teams } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("tournament_id", id);

  const captainIds = new Set(teams?.map((t) => t.captain_id) ?? []);

  // Filter: willing substitutes who were NOT drafted and are NOT captains
  const unpickedSubstitutes = (registrations ?? []).filter(
    (reg) => !draftedUserIds.has(reg.user_id) && !captainIds.has(reg.user_id)
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Available Substitutes</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Players who were not drafted but opted in as substitutes.
      </p>
      <SubstitutesList
        substitutes={unpickedSubstitutes}
        playerValues={playerValues ?? []}
      />
    </div>
  );
}
