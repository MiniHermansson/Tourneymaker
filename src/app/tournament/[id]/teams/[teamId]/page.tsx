import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamDetails } from "./team-details";
import type { TournamentStatus } from "@/lib/constants";

interface TeamPageProps {
  params: Promise<{ id: string; teamId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id, teamId } = await params;
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
    .select("status")
    .eq("id", id)
    .single();

  const { data: team } = await supabase
    .from("teams")
    .select(
      "*, profiles!teams_captain_id_fkey(*), team_members(*, profiles(*))"
    )
    .eq("id", teamId)
    .single();

  if (!team || !tournament) notFound();

  const isCaptain = team.captain_id === user.id;
  const isOrganizer = profile?.is_organizer ?? false;
  const status = tournament.status as TournamentStatus;
  const canEdit =
    (isCaptain && status === "team_setup") || isOrganizer;

  return (
    <TeamDetails
      team={team}
      tournamentId={id}
      canEdit={canEdit}
      isOrganizer={isOrganizer}
    />
  );
}
