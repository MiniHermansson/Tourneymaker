import type { TournamentStatus, TournamentFormat } from "@/lib/constants";

export interface TournamentData {
  id: string;
  status: TournamentStatus;
  format: TournamentFormat;
  name: string;
  group_size: number | null;
  group_count: number | null;
  playoff_type: string | null;
  team_budget: number;
  registrationCount?: number;
  captainsAssigned?: number;
  allPlayerValuesSet?: boolean;
  allDraftPicksCompleted?: boolean;
  allTeamsNamed?: boolean;
  allGroupsHaveTeams?: boolean;
  allGroupMatchesGenerated?: boolean;
  allGroupMatchesCompleted?: boolean;
  allPlayoffMatchesCompleted?: boolean;
}

interface TransitionResult {
  allowed: boolean;
  error?: string;
}

const CAPTAINS_DRAFT_ONLY: TournamentStatus[] = [
  "scouting",
  "captains_draft",
];

function getNextStatuses(
  current: TournamentStatus,
  format: TournamentFormat
): TournamentStatus[] {
  const allTransitions: Record<TournamentStatus, TournamentStatus[]> = {
    setup: ["registration"],
    registration: ["planning"],
    planning: format === "captains_draft" ? ["scouting"] : ["team_setup"],
    scouting: ["captains_draft"],
    captains_draft: ["team_setup"],
    team_setup: ["group_stage"],
    group_stage: ["playoff"],
    playoff: ["results"],
    results: ["archived"],
    archived: [],
  };

  return allTransitions[current];
}

function validateTransition(
  tournament: TournamentData,
  to: TournamentStatus
): TransitionResult {
  const { status: from, format } = tournament;

  // Check if this is a valid next state
  const validNextStates = getNextStatuses(from, format);
  if (!validNextStates.includes(to)) {
    return {
      allowed: false,
      error: `Cannot transition from ${from} to ${to}`,
    };
  }

  // Skip captains_draft-only stages for premade_teams
  if (
    format === "premade_teams" &&
    CAPTAINS_DRAFT_ONLY.includes(to)
  ) {
    return {
      allowed: false,
      error: `${to} is only available for captains draft tournaments`,
    };
  }

  // Stage-specific guards
  switch (to) {
    case "registration":
      if (!tournament.name.trim()) {
        return { allowed: false, error: "Tournament must have a name" };
      }
      break;

    case "planning":
      if (!tournament.registrationCount || tournament.registrationCount < 2) {
        return {
          allowed: false,
          error: "Need at least 2 registered players",
        };
      }
      break;

    case "scouting":
      if (!tournament.group_size || !tournament.group_count) {
        return { allowed: false, error: "Group configuration is required" };
      }
      if ((tournament.captainsAssigned ?? 0) < 2) {
        return {
          allowed: false,
          error: "At least 2 captains must be assigned",
        };
      }
      if (!tournament.allPlayerValuesSet) {
        return {
          allowed: false,
          error: "All player values must be set",
        };
      }
      break;

    case "captains_draft":
      // No additional guard beyond being in scouting - organizer decides when ready
      break;

    case "team_setup":
      if (format === "captains_draft" && !tournament.allDraftPicksCompleted) {
        return {
          allowed: false,
          error: "All draft picks must be completed",
        };
      }
      break;

    case "group_stage":
      if (!tournament.allTeamsNamed) {
        return {
          allowed: false,
          error: "All teams must have names",
        };
      }
      if (!tournament.allGroupsHaveTeams) {
        return {
          allowed: false,
          error: "All groups must have teams assigned",
        };
      }
      break;

    case "playoff":
      if (!tournament.allGroupMatchesCompleted) {
        return {
          allowed: false,
          error: "All group stage matches must be completed",
        };
      }
      break;

    case "results":
      if (!tournament.allPlayoffMatchesCompleted) {
        return {
          allowed: false,
          error: "All playoff matches must be completed",
        };
      }
      break;

    case "archived":
      // Always allowed from results
      break;
  }

  return { allowed: true };
}

export function canAdvance(
  tournament: TournamentData,
  to?: TournamentStatus
): TransitionResult {
  if (to) {
    return validateTransition(tournament, to);
  }

  const nextStates = getNextStatuses(tournament.status, tournament.format);
  if (nextStates.length === 0) {
    return { allowed: false, error: "No further stages available" };
  }

  return validateTransition(tournament, nextStates[0]);
}

export function getNextStatus(
  tournament: TournamentData
): TournamentStatus | null {
  const nextStates = getNextStatuses(tournament.status, tournament.format);
  return nextStates[0] ?? null;
}

export function getVisiblePages(
  status: TournamentStatus,
  format: TournamentFormat
): string[] {
  const pages: string[] = ["overview"];

  const stageIndex = [
    "setup",
    "registration",
    "planning",
    "scouting",
    "captains_draft",
    "team_setup",
    "group_stage",
    "playoff",
    "results",
    "archived",
  ].indexOf(status);

  if (stageIndex >= 1) pages.push("register");
  if (stageIndex >= 2) pages.push("planning");
  if (stageIndex >= 3 && format === "captains_draft") pages.push("scouting");
  if (stageIndex >= 4 && format === "captains_draft") pages.push("draft");
  if (stageIndex >= 5) pages.push("teams");
  if (stageIndex >= 6) pages.push("groups");
  if (stageIndex >= 7) pages.push("playoffs");
  if (stageIndex >= 8) pages.push("results");
  if (stageIndex >= 9) pages.push("archive");

  return pages;
}
