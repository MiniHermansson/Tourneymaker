import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchReport } from "./match-report";

interface MatchPageProps {
  params: Promise<{ id: string; matchId: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id, matchId } = await params;
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

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  // Fetch both teams
  const { data: teamA } = match.team_a_id
    ? await supabase.from("teams").select("*").eq("id", match.team_a_id).single()
    : { data: null };

  const { data: teamB } = match.team_b_id
    ? await supabase.from("teams").select("*").eq("id", match.team_b_id).single()
    : { data: null };

  // Fetch match games
  const { data: games } = await supabase
    .from("match_games")
    .select("*")
    .eq("match_id", matchId)
    .order("game_number");

  const isOrganizer = profile?.is_organizer ?? false;
  const isCaptainA = teamA?.captain_id === user.id;
  const isCaptainB = teamB?.captain_id === user.id;

  return (
    <MatchReport
      match={match}
      teamA={teamA}
      teamB={teamB}
      games={games ?? []}
      tournamentId={id}
      isOrganizer={isOrganizer}
      isCaptainA={isCaptainA}
      isCaptainB={isCaptainB}
      userId={user.id}
    />
  );
}
