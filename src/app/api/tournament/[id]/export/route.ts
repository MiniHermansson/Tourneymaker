import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*, profiles(discord_username, lol_gamertag, opgg_url, current_rank_tier)")
    .eq("tournament_id", id);

  const { data: teams } = await supabase
    .from("teams")
    .select("*, team_members(*, profiles(discord_username, lol_gamertag))")
    .eq("tournament_id", id);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, match_games(*)")
    .eq("tournament_id", id)
    .order("created_at");

  const { data: groups } = await supabase
    .from("groups")
    .select("*, group_teams(*, teams(name, tag))")
    .eq("tournament_id", id);

  const { data: bracketSlots } = await supabase
    .from("playoff_bracket_slots")
    .select("*")
    .eq("tournament_id", id);

  const { data: results } = await supabase
    .from("tournament_results")
    .select("*")
    .eq("tournament_id", id)
    .single();

  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("tournament_id", id)
    .order("pick_number");

  const exportData = {
    exportedAt: new Date().toISOString(),
    tournament,
    registrations,
    teams,
    groups,
    matches,
    bracketSlots,
    results,
    draftPicks,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tournament-${tournament.name.replace(/\s+/g, "-")}-${id}.json"`,
    },
  });
}
