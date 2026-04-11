import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanningConfig } from "./planning-config";
import { CaptainAssignment } from "./captain-assignment";
import { PlayerValueAssignment } from "./player-value-assignment";
import type { TournamentStatus } from "@/lib/constants";

interface PlanningPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanningPage({ params }: PlanningPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .single();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) redirect("/");

  const isOrganizer = profile?.is_organizer ?? false;
  const status = tournament.status as TournamentStatus;
  const isPlanningPhase = status === "planning";

  // Get registrations with profile info
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(*)")
    .eq("tournament_id", id)
    .order("created_at");

  // Get existing player values
  const { data: playerValues } = await supabase
    .from("draft_player_values")
    .select("*")
    .eq("tournament_id", id);

  // Get existing teams (for captain assignment)
  const { data: teams } = await supabase
    .from("teams")
    .select("*, profiles!teams_captain_id_fkey(*)")
    .eq("tournament_id", id);

  return (
    <div className="space-y-6">
      {!isOrganizer && (
        <p className="text-muted-foreground">
          Only organizers can configure tournament settings.
        </p>
      )}

      {isOrganizer && (
        <>
          <PlanningConfig
            tournament={tournament}
            disabled={!isPlanningPhase}
          />

          {tournament.format === "captains_draft" && (
            <>
              <CaptainAssignment
                tournamentId={id}
                registrations={registrations ?? []}
                teams={teams ?? []}
                disabled={!isPlanningPhase}
                teamBudget={tournament.team_budget}
              />

              <PlayerValueAssignment
                tournamentId={id}
                registrations={registrations ?? []}
                playerValues={playerValues ?? []}
                disabled={!isPlanningPhase}
                defaultValue={tournament.default_player_value}
                minValue={tournament.min_player_value}
                maxValue={tournament.max_player_value}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
