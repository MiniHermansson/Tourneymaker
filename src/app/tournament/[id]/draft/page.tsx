import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DraftBoard } from "./draft-board";

interface DraftPageProps {
  params: Promise<{ id: string }>;
}

export default async function DraftPage({ params }: DraftPageProps) {
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

  const isOrganizer = profile?.is_organizer ?? false;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) redirect("/");

  // Get registrations with profiles
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(*)")
    .eq("tournament_id", id);

  // Get player values
  const { data: playerValues } = await supabase
    .from("draft_player_values")
    .select("*")
    .eq("tournament_id", id);

  // Get teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*, profiles!teams_captain_id_fkey(*), team_members(*, profiles(*))")
    .eq("tournament_id", id);

  // Get draft state
  const { data: draftState } = await supabase
    .from("draft_state")
    .select("*")
    .eq("tournament_id", id)
    .single();

  // Get draft order
  const { data: draftOrder } = await supabase
    .from("draft_order")
    .select("*")
    .eq("tournament_id", id)
    .order("pick_number");

  // Get existing picks
  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("tournament_id", id)
    .order("pick_number");

  return (
    <DraftBoard
      tournamentId={id}
      tournament={tournament}
      registrations={registrations ?? []}
      playerValues={playerValues ?? []}
      teams={teams ?? []}
      initialDraftState={draftState}
      draftOrder={draftOrder ?? []}
      initialPicks={draftPicks ?? []}
      isOrganizer={isOrganizer}
    />
  );
}
