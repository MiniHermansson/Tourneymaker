/**
 * Generates a single elimination bracket from seeded teams.
 * Higher seeds play lower seeds. Top seeds get byes if teams don't fill a power of 2.
 */
export interface BracketSlot {
  position: string;
  round: number;
  slotIndex: number;
  teamId: string | null;
  nextPosition: string | null;
  matchLabel: string;
}

export function generateSingleEliminationBracket(
  seededTeamIds: string[]
): BracketSlot[] {
  const n = seededTeamIds.length;
  if (n < 2) return [];

  // Find next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalRounds = Math.log2(bracketSize);
  const byes = bracketSize - n;

  // Standard seeding: 1 vs bracketSize, 2 vs bracketSize-1, etc.
  const round1Matchups: Array<{
    teamA: string | null;
    teamB: string | null;
  }> = [];

  // Generate proper seeding order for the bracket
  const seedOrder = generateSeedOrder(bracketSize);

  for (let i = 0; i < bracketSize; i += 2) {
    const seedA = seedOrder[i];
    const seedB = seedOrder[i + 1];
    round1Matchups.push({
      teamA: seedA <= n ? seededTeamIds[seedA - 1] : null,
      teamB: seedB <= n ? seededTeamIds[seedB - 1] : null,
    });
  }

  const slots: BracketSlot[] = [];
  let matchIndex = 0;

  // Generate Round 1
  for (let i = 0; i < round1Matchups.length; i++) {
    const matchup = round1Matchups[i];
    const isBye = matchup.teamA === null || matchup.teamB === null;

    if (!isBye) {
      const nextRoundMatch = Math.floor(i / 2);
      slots.push({
        position: `W-R1-M${i + 1}`,
        round: 1,
        slotIndex: i,
        teamId: null, // Will be filled when match is played
        nextPosition: totalRounds > 1 ? `W-R2-M${nextRoundMatch + 1}` : null,
        matchLabel: `R1 Match ${i + 1}`,
      });
    }
    // If bye, the team auto-advances to round 2
  }

  // Generate subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const nextPosition =
        round < totalRounds ? `W-R${round + 1}-M${Math.floor(i / 2) + 1}` : null;

      const roundLabel =
        round === totalRounds
          ? "Finals"
          : round === totalRounds - 1
            ? `Semifinal ${i + 1}`
            : `R${round} Match ${i + 1}`;

      slots.push({
        position: `W-R${round}-M${i + 1}`,
        round,
        slotIndex: i,
        teamId: null,
        nextPosition,
        matchLabel: roundLabel,
      });
    }
  }

  return slots;
}

/**
 * Generates standard tournament seed ordering.
 * For 8 teams: [1,8,4,5,2,7,3,6]
 * This ensures 1 plays 8, 4 plays 5, etc. and higher seeds only meet later.
 */
function generateSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const half = size / 2;
  const topHalf = generateSeedOrder(half);
  const result: number[] = [];

  for (const seed of topHalf) {
    result.push(seed);
    result.push(size + 1 - seed);
  }

  return result;
}

/**
 * Seeds teams from group standings.
 * Higher seeds from groups vs lower seeds, distributed to avoid same-group matchups.
 */
export function seedTeamsFromGroups(
  groups: Array<{
    groupName: string;
    teams: Array<{ teamId: string; seed: number }>;
  }>,
  teamsPerGroup: number
): string[] {
  // Interleave seeds across groups
  // Seed 1s from each group, then seed 2s, etc.
  const seeded: string[] = [];

  for (let seedPos = 0; seedPos < teamsPerGroup; seedPos++) {
    const teamsAtSeed = groups
      .map((g) => g.teams[seedPos]?.teamId)
      .filter(Boolean) as string[];

    // Alternate order each seed to spread groups in the bracket
    if (seedPos % 2 === 1) teamsAtSeed.reverse();
    seeded.push(...teamsAtSeed);
  }

  return seeded;
}
