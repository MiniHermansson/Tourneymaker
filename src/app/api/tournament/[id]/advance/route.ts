import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TournamentStatus } from "@/lib/constants";

export async function POST(
  request: Request,
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_organizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { nextStatus } = (await request.json()) as {
    nextStatus: TournamentStatus;
  };

  // Use admin client for operations that bypass RLS
  const admin = createAdminClient();

  // Recalculate team budgets when entering captains_draft
  if (nextStatus === "captains_draft") {
    const recalcResult = await recalculateTeamBudgets(admin, id);
    if (recalcResult.error) {
      return NextResponse.json({ error: recalcResult.error }, { status: 500 });
    }
  }

  // Auto-generate groups when entering team_setup
  if (nextStatus === "team_setup") {
    const genResult = await generateGroups(admin, id);
    if (genResult.error) {
      return NextResponse.json({ error: genResult.error }, { status: 500 });
    }
  }

  // Auto-generate group matches when entering group_stage
  if (nextStatus === "group_stage") {
    const genResult = await generateGroupMatches(admin, id);
    if (genResult.error) {
      return NextResponse.json({ error: genResult.error }, { status: 500 });
    }
  }

  // Auto-generate playoff bracket when entering playoff
  if (nextStatus === "playoff") {
    const genResult = await generatePlayoffBracket(admin, id);
    if (genResult.error) {
      return NextResponse.json({ error: genResult.error }, { status: 500 });
    }
  }

  // Auto-generate results when entering results
  if (nextStatus === "results") {
    const genResult = await generateResults(admin, id);
    if (genResult.error) {
      return NextResponse.json({ error: genResult.error }, { status: 500 });
    }
  }

  const { error } = await admin
    .from("tournaments")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function recalculateTeamBudgets(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string
): Promise<{ error?: string }> {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("team_budget")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    return { error: "Tournament not found" };
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, captain_id")
    .eq("tournament_id", tournamentId);

  if (!teams || teams.length === 0) {
    return { error: "No teams found" };
  }

  const captainIds = teams.map((t) => t.captain_id).filter(Boolean) as string[];

  const { data: captainValues } = await supabase
    .from("draft_player_values")
    .select("user_id, value")
    .eq("tournament_id", tournamentId)
    .in("user_id", captainIds);

  const valueMap = new Map(
    (captainValues ?? []).map((cv) => [cv.user_id, cv.value])
  );

  for (const team of teams) {
    const captainValue = valueMap.get(team.captain_id!) ?? 0;
    await supabase
      .from("teams")
      .update({ budget_remaining: tournament.team_budget - captainValue })
      .eq("id", team.id);
  }

  return {};
}

async function generateGroups(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string
): Promise<{ error?: string }> {
  // Get tournament config
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("group_count, group_size")
    .eq("id", tournamentId)
    .single();

  if (!tournament?.group_count) {
    return { error: "Group configuration not set" };
  }

  // Check if groups already exist
  const { count: existingGroups } = await supabase
    .from("groups")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if ((existingGroups ?? 0) > 0) {
    return {}; // Groups already generated, skip
  }

  // Get all teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (!teams || teams.length === 0) {
    return { error: "No teams found" };
  }

  // Shuffle teams for random group assignment
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Create groups
  const groupCount = tournament.group_count;
  const groupNames = Array.from({ length: groupCount }, (_, i) =>
    `Group ${String.fromCharCode(65 + i)}`
  );

  const { data: createdGroups, error: groupError } = await supabase
    .from("groups")
    .insert(
      groupNames.map((name, i) => ({
        tournament_id: tournamentId,
        name,
        display_order: i,
      }))
    )
    .select("id, display_order");

  if (groupError || !createdGroups) {
    return { error: "Failed to create groups: " + groupError?.message };
  }

  // Distribute teams across groups (round-robin assignment)
  const groupTeamInserts = shuffled.map((team, i) => ({
    group_id: createdGroups[i % groupCount].id,
    team_id: team.id,
  }));

  const { error: gtError } = await supabase
    .from("group_teams")
    .insert(groupTeamInserts);

  if (gtError) {
    return { error: "Failed to assign teams to groups: " + gtError.message };
  }

  return {};
}

async function generateGroupMatches(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string
): Promise<{ error?: string }> {
  // Check if matches already exist
  const { count: existingMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("stage", "group");

  if ((existingMatches ?? 0) > 0) {
    return {}; // Matches already generated, skip
  }

  // Get tournament BO format
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("group_bo_format")
    .eq("id", tournamentId)
    .single();

  // Get all groups with their teams
  const { data: groups } = await supabase
    .from("groups")
    .select("id, group_teams(team_id)")
    .eq("tournament_id", tournamentId);

  if (!groups || groups.length === 0) {
    return { error: "No groups found" };
  }

  const matchInserts: Array<{
    tournament_id: string;
    stage: "group";
    group_id: string;
    round: number;
    team_a_id: string;
    team_b_id: string;
    bo_format: string;
  }> = [];

  // Generate round-robin matches within each group
  for (const group of groups) {
    const teamIds = (group.group_teams as Array<{ team_id: string }>).map(
      (gt) => gt.team_id
    );

    let round = 1;
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        matchInserts.push({
          tournament_id: tournamentId,
          stage: "group",
          group_id: group.id,
          round,
          team_a_id: teamIds[i],
          team_b_id: teamIds[j],
          bo_format: tournament?.group_bo_format ?? "bo1",
        });
        round++;
      }
    }
  }

  if (matchInserts.length > 0) {
    const { error } = await supabase.from("matches").insert(matchInserts);
    if (error) {
      return { error: "Failed to create matches: " + error.message };
    }
  }

  return {};
}

async function generatePlayoffBracket(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string
): Promise<{ error?: string }> {
  // Check if bracket already exists
  const { count: existing } = await supabase
    .from("playoff_bracket_slots")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if ((existing ?? 0) > 0) {
    return {}; // Already generated
  }

  // Get tournament config
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("playoff_bo_format, finals_bo_format, teams_advancing_per_group")
    .eq("id", tournamentId)
    .single();

  const teamsAdvancing = tournament?.teams_advancing_per_group ?? 2;

  // Get group standings to seed teams
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, display_order, group_teams(team_id, wins, losses, map_wins, map_losses, points)")
    .eq("tournament_id", tournamentId)
    .order("display_order");

  if (!groups || groups.length === 0) {
    return { error: "No groups found" };
  }

  // Build seeded team list from group standings
  const seededTeams: string[] = [];

  // For each seed position, collect teams from all groups
  for (let seedPos = 0; seedPos < teamsAdvancing; seedPos++) {
    const teamsAtSeed: Array<{ teamId: string; points: number; mapDiff: number }> = [];

    for (const group of groups) {
      const groupTeams = (group.group_teams as Array<{
        team_id: string;
        wins: number;
        losses: number;
        map_wins: number;
        map_losses: number;
        points: number;
      }>)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return (b.map_wins - b.map_losses) - (a.map_wins - a.map_losses);
        });

      if (groupTeams[seedPos]) {
        const t = groupTeams[seedPos];
        teamsAtSeed.push({
          teamId: t.team_id,
          points: t.points,
          mapDiff: t.map_wins - t.map_losses,
        });
      }
    }

    // Alternate order each seed position to spread groups in bracket
    if (seedPos % 2 === 1) teamsAtSeed.reverse();
    seededTeams.push(...teamsAtSeed.map((t) => t.teamId));
  }

  if (seededTeams.length < 2) {
    return { error: "Need at least 2 teams for playoffs" };
  }

  // Generate bracket structure
  const n = seededTeams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalRounds = Math.log2(bracketSize);

  // Generate proper seeding order
  function genSeedOrder(size: number): number[] {
    if (size === 1) return [1];
    if (size === 2) return [1, 2];
    const half = size / 2;
    const top = genSeedOrder(half);
    const result: number[] = [];
    for (const seed of top) {
      result.push(seed);
      result.push(size + 1 - seed);
    }
    return result;
  }

  const seedOrder = genSeedOrder(bracketSize);

  // Build round 1 matchups
  const round1Matchups: Array<{ teamA: string | null; teamB: string | null }> = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const seedA = seedOrder[i];
    const seedB = seedOrder[i + 1];
    round1Matchups.push({
      teamA: seedA <= n ? seededTeams[seedA - 1] : null,
      teamB: seedB <= n ? seededTeams[seedB - 1] : null,
    });
  }

  // Create matches and bracket slots
  const playoffBoFormat = tournament?.playoff_bo_format ?? "bo3";
  const finalsBoFormat = tournament?.finals_bo_format ?? "bo5";

  // First, create all bracket slots
  const slotInserts: Array<{
    tournament_id: string;
    position: string;
    round: number;
    slot_index: number;
  }> = [];

  // Round 1 slots (only for actual matches, not byes)
  for (let i = 0; i < round1Matchups.length; i++) {
    slotInserts.push({
      tournament_id: tournamentId,
      position: `W-R1-M${i + 1}`,
      round: 1,
      slot_index: i,
    });
  }

  // Later round slots
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      slotInserts.push({
        tournament_id: tournamentId,
        position: `W-R${round}-M${i + 1}`,
        round,
        slot_index: i,
      });
    }
  }

  const { data: createdSlots, error: slotError } = await supabase
    .from("playoff_bracket_slots")
    .insert(slotInserts)
    .select("id, position, round, slot_index");

  if (slotError || !createdSlots) {
    return { error: "Failed to create bracket slots: " + slotError?.message };
  }

  // Build a position->id map
  const slotMap = new Map(createdSlots.map((s) => [s.position, s.id]));

  // Update next_slot_id references
  for (const slot of createdSlots) {
    if (slot.round < totalRounds) {
      const nextPos = `W-R${slot.round + 1}-M${Math.floor(slot.slot_index / 2) + 1}`;
      const nextId = slotMap.get(nextPos);
      if (nextId) {
        await supabase
          .from("playoff_bracket_slots")
          .update({ next_slot_id: nextId })
          .eq("id", slot.id);
      }
    }
  }

  // Create matches for round 1 and assign to slots
  for (let i = 0; i < round1Matchups.length; i++) {
    const matchup = round1Matchups[i];
    const isBye = matchup.teamA === null || matchup.teamB === null;
    const slotPosition = `W-R1-M${i + 1}`;
    const slotId = slotMap.get(slotPosition);

    if (isBye) {
      // Auto-advance the non-null team — no match needed
      // The team that exists auto-advances; mark the slot with their team
      // We'll handle this by creating a completed match
      const byeTeam = matchup.teamA ?? matchup.teamB;
      if (byeTeam && slotId) {
        const { data: byeMatch } = await supabase
          .from("matches")
          .insert({
            tournament_id: tournamentId,
            stage: "playoff",
            round: 1,
            team_a_id: byeTeam,
            team_b_id: null,
            bo_format: playoffBoFormat,
            winner_id: byeTeam,
            is_completed: true,
            team_a_score: 0,
            team_b_score: 0,
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (byeMatch) {
          await supabase
            .from("playoff_bracket_slots")
            .update({ match_id: byeMatch.id })
            .eq("id", slotId);
        }
      }
    } else {
      // Create a real match
      const boFormat = totalRounds === 1 ? finalsBoFormat : playoffBoFormat;
      const { data: newMatch } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          stage: "playoff",
          round: 1,
          team_a_id: matchup.teamA,
          team_b_id: matchup.teamB,
          bo_format: boFormat,
        })
        .select("id")
        .single();

      if (newMatch && slotId) {
        await supabase
          .from("playoff_bracket_slots")
          .update({ match_id: newMatch.id })
          .eq("id", slotId);
      }
    }
  }

  // Create placeholder matches for later rounds
  const laterRoundMatchMap = new Map<string, string>(); // slotPosition -> matchId
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const slotPosition = `W-R${round}-M${i + 1}`;
      const slotId = slotMap.get(slotPosition);
      const boFormat = round === totalRounds ? finalsBoFormat : playoffBoFormat;

      const { data: newMatch } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          stage: "playoff",
          round,
          team_a_id: null,
          team_b_id: null,
          bo_format: boFormat,
        })
        .select("id")
        .single();

      if (newMatch && slotId) {
        await supabase
          .from("playoff_bracket_slots")
          .update({ match_id: newMatch.id })
          .eq("id", slotId);
        laterRoundMatchMap.set(slotPosition, newMatch.id);
      }
    }
  }

  // Auto-advance bye winners into the next round
  for (let i = 0; i < round1Matchups.length; i++) {
    const matchup = round1Matchups[i];
    const isBye = matchup.teamA === null || matchup.teamB === null;
    if (!isBye) continue;

    const byeTeam = matchup.teamA ?? matchup.teamB;
    if (!byeTeam) continue;

    // Find the next round match for this slot
    const nextPos = `W-R2-M${Math.floor(i / 2) + 1}`;
    const nextMatchId = laterRoundMatchMap.get(nextPos);
    if (!nextMatchId) continue;

    // Even slot_index -> team_a, odd -> team_b
    const field = i % 2 === 0 ? "team_a_id" : "team_b_id";
    await supabase
      .from("matches")
      .update({ [field]: byeTeam })
      .eq("id", nextMatchId);
  }

  return {};
}

async function generateResults(
  supabase: ReturnType<typeof createAdminClient>,
  tournamentId: string
): Promise<{ error?: string }> {
  // Check if results already exist
  const { count: existing } = await supabase
    .from("tournament_results")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if ((existing ?? 0) > 0) {
    return {}; // Already generated
  }

  // Find the finals match (highest round)
  const { data: slots } = await supabase
    .from("playoff_bracket_slots")
    .select("*, matches(*)")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: false });

  if (!slots || slots.length === 0) {
    return { error: "No playoff bracket found" };
  }

  const maxRound = slots[0].round;
  const finalsSlot = slots.find((s) => s.round === maxRound);
  const finalsMatch = finalsSlot?.matches as Record<string, unknown> | null;

  if (!finalsMatch?.winner_id) {
    return { error: "Finals match has no winner yet" };
  }

  const firstPlaceId = finalsMatch.winner_id as string;
  const secondPlaceId =
    (finalsMatch.team_a_id as string) === firstPlaceId
      ? (finalsMatch.team_b_id as string)
      : (finalsMatch.team_a_id as string);

  // Find 3rd place: losers of the semifinal round
  let thirdPlaceId: string | null = null;
  if (maxRound >= 2) {
    const semiFinalSlots = slots.filter((s) => s.round === maxRound - 1);
    for (const slot of semiFinalSlots) {
      const match = slot.matches as Record<string, unknown> | null;
      if (match?.winner_id && match?.is_completed) {
        const loserId =
          (match.team_a_id as string) === (match.winner_id as string)
            ? (match.team_b_id as string)
            : (match.team_a_id as string);
        if (loserId && loserId !== secondPlaceId) {
          thirdPlaceId = loserId;
          break;
        }
      }
    }
  }

  const { error } = await supabase.from("tournament_results").insert({
    tournament_id: tournamentId,
    first_place_id: firstPlaceId,
    second_place_id: secondPlaceId,
    third_place_id: thirdPlaceId,
  });

  if (error) {
    return { error: "Failed to create results: " + error.message };
  }

  return {};
}
