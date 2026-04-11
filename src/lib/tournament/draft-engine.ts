/**
 * Generates a snake draft order for the given teams.
 * Snake pattern: 1,2,3,...,N, N,...,3,2,1, 1,2,3,...,N, ...
 */
export function generateSnakeDraftOrder(
  teamIds: string[],
  picksPerTeam: number
): { pickNumber: number; round: number; teamId: string }[] {
  const order: { pickNumber: number; round: number; teamId: string }[] = [];
  let pickNumber = 1;

  for (let round = 1; round <= picksPerTeam; round++) {
    const isEvenRound = round % 2 === 0;
    const teams = isEvenRound ? [...teamIds].reverse() : teamIds;

    for (const teamId of teams) {
      order.push({ pickNumber, round, teamId });
      pickNumber++;
    }
  }

  return order;
}

/**
 * Validates whether a team can pick a specific player given budget constraints.
 */
export function validatePick(
  teamBudgetRemaining: number,
  playerValue: number,
  picksRemaining: number
): { valid: boolean; error?: string } {
  if (playerValue > teamBudgetRemaining) {
    return {
      valid: false,
      error: `Player value (${playerValue}) exceeds team's remaining budget (${teamBudgetRemaining})`,
    };
  }

  // Check if team can still fill remaining slots with minimum-value players
  // After this pick, the team needs (picksRemaining - 1) more picks
  // Each remaining pick costs at least 0 (min value)
  // So we just need: budget - playerValue >= 0
  // More sophisticated: budget - playerValue >= (picksRemaining - 1) * minPossibleValue
  // For now, minPossibleValue = 0, so just check non-negative
  if (teamBudgetRemaining - playerValue < 0) {
    return {
      valid: false,
      error: "Insufficient budget",
    };
  }

  return { valid: true };
}
