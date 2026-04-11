import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const { matchId } = (await request.json()) as { matchId: string };

  const supabase = createAdminClient();

  // Get the completed match
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match || !match.is_completed) {
    return NextResponse.json({ skipped: true });
  }

  // Handle playoff bracket advancement
  if (match.stage === "playoff" && match.winner_id) {
    await advancePlayoffWinner(supabase, tournamentId, matchId, match.winner_id);
    return NextResponse.json({ success: true });
  }

  if (match.stage !== "group" || !match.group_id) {
    return NextResponse.json({ skipped: true });
  }

  const winnerId = match.winner_id;
  const loserId =
    match.team_a_id === winnerId ? match.team_b_id : match.team_a_id;

  const winnerScore =
    match.team_a_id === winnerId ? match.team_a_score : match.team_b_score;
  const loserScore =
    match.team_a_id === winnerId ? match.team_b_score : match.team_a_score;

  // Update winner's group_teams record
  if (winnerId) {
    const { data: winnerGt } = await supabase
      .from("group_teams")
      .select("*")
      .eq("group_id", match.group_id)
      .eq("team_id", winnerId)
      .single();

    if (winnerGt) {
      await supabase
        .from("group_teams")
        .update({
          wins: (winnerGt.wins ?? 0) + 1,
          map_wins: (winnerGt.map_wins ?? 0) + (winnerScore ?? 0),
          map_losses: (winnerGt.map_losses ?? 0) + (loserScore ?? 0),
          points: (winnerGt.points ?? 0) + 3,
        })
        .eq("id", winnerGt.id);
    }
  }

  // Update loser's group_teams record
  if (loserId) {
    const { data: loserGt } = await supabase
      .from("group_teams")
      .select("*")
      .eq("group_id", match.group_id)
      .eq("team_id", loserId)
      .single();

    if (loserGt) {
      await supabase
        .from("group_teams")
        .update({
          losses: (loserGt.losses ?? 0) + 1,
          map_wins: (loserGt.map_wins ?? 0) + (loserScore ?? 0),
          map_losses: (loserGt.map_losses ?? 0) + (winnerScore ?? 0),
          points: loserGt.points ?? 0,
        })
        .eq("id", loserGt.id);
    }
  }

  return NextResponse.json({ success: true });
}

async function advancePlayoffWinner(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  matchId: string,
  winnerId: string
) {
  // Find the bracket slot for this match
  const { data: slot } = await supabase
    .from("playoff_bracket_slots")
    .select("id, slot_index, next_slot_id")
    .eq("tournament_id", tournamentId)
    .eq("match_id", matchId)
    .single();

  if (!slot?.next_slot_id) return; // Finals match, no next slot

  // Find the next slot to get its match_id
  const { data: nextSlot } = await supabase
    .from("playoff_bracket_slots")
    .select("id, match_id")
    .eq("id", slot.next_slot_id)
    .single();

  if (!nextSlot?.match_id) return;

  // Even slot_index -> team_a, odd -> team_b in the next match
  const field = slot.slot_index % 2 === 0 ? "team_a_id" : "team_b_id";

  await supabase
    .from("matches")
    .update({ [field]: winnerId })
    .eq("id", nextSlot.match_id);
}
