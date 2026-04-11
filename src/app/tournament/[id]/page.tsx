import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentOverview } from "./tournament-overview";
import type { TournamentStatus, TournamentFormat } from "@/lib/constants";

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOrganizer = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_organizer")
      .eq("id", user.id)
      .single();
    isOrganizer = profile?.is_organizer ?? false;
  }

  // Get registration count
  const { count: registrationCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  // Get teams (captains = teams with captain_id)
  const { data: teams } = await supabase
    .from("teams")
    .select("id, captain_id, name")
    .eq("tournament_id", id);

  const teamCount = teams?.length ?? 0;
  const captainsAssigned = teams?.filter((t) => t.captain_id).length ?? 0;
  const allTeamsNamed = teamCount > 0 && teams!.every((t) => t.name);

  // Check player values
  const { count: playerValueCount } = await supabase
    .from("draft_player_values")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  const allPlayerValuesSet =
    (registrationCount ?? 0) > 0 &&
    (playerValueCount ?? 0) >= (registrationCount ?? 0);

  // Check draft completion
  const { data: draftState } = await supabase
    .from("draft_state")
    .select("completed_at")
    .eq("tournament_id", id)
    .single();

  const allDraftPicksCompleted = !!draftState?.completed_at;

  // Check groups have teams
  const { data: groups } = await supabase
    .from("groups")
    .select("id")
    .eq("tournament_id", id);

  let allGroupsHaveTeams = false;
  if (groups && groups.length > 0) {
    const { count: groupTeamCount } = await supabase
      .from("group_teams")
      .select("*", { count: "exact", head: true })
      .in("group_id", groups.map((g) => g.id));
    allGroupsHaveTeams = (groupTeamCount ?? 0) > 0;
  }

  // Check group matches completed
  const { data: groupMatches } = await supabase
    .from("matches")
    .select("id, is_completed")
    .eq("tournament_id", id)
    .eq("stage", "group");

  const allGroupMatchesCompleted =
    (groupMatches?.length ?? 0) > 0 &&
    groupMatches!.every((m) => m.is_completed);

  // Check playoff matches completed
  const { data: playoffMatches } = await supabase
    .from("matches")
    .select("id, is_completed")
    .eq("tournament_id", id)
    .eq("stage", "playoff");

  const allPlayoffMatchesCompleted =
    (playoffMatches?.length ?? 0) > 0 &&
    playoffMatches!.every((m) => m.is_completed);

  return (
    <TournamentOverview
      tournament={tournament}
      isOrganizer={isOrganizer}
      registrationCount={registrationCount ?? 0}
      teamCount={teamCount}
      captainsAssigned={captainsAssigned}
      allPlayerValuesSet={allPlayerValuesSet}
      allDraftPicksCompleted={allDraftPicksCompleted}
      allTeamsNamed={allTeamsNamed}
      allGroupsHaveTeams={allGroupsHaveTeams}
      allGroupMatchesCompleted={allGroupMatchesCompleted}
      allPlayoffMatchesCompleted={allPlayoffMatchesCompleted}
    />
  );
}
