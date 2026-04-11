export const TOURNAMENT_STATUSES = [
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
] as const;

export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  setup: "Setup",
  registration: "Registration",
  planning: "Planning",
  scouting: "Scouting",
  captains_draft: "Captains Draft",
  team_setup: "Team Setup",
  group_stage: "Group Stage",
  playoff: "Playoff",
  results: "Results",
  archived: "Archived",
};

export const TOURNAMENT_FORMATS = ["premade_teams", "captains_draft"] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const LOL_ROLES = [
  "top",
  "jungle",
  "mid",
  "adc",
  "support",
  "fill",
] as const;
export type LolRole = (typeof LOL_ROLES)[number];

export const LOL_ROLE_LABELS: Record<LolRole, string> = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  adc: "ADC",
  support: "Support",
  fill: "Fill",
};

export const BO_FORMATS = ["bo1", "bo3", "bo5"] as const;
export type BoFormat = (typeof BO_FORMATS)[number];

export const PLAYOFF_FORMATS = [
  "single_elimination",
  "double_elimination",
] as const;
export type PlayoffFormat = (typeof PLAYOFF_FORMATS)[number];

export const LOL_RANKS = [
  "unranked",
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
] as const;
export type LolRank = (typeof LOL_RANKS)[number];

export const LOL_RANK_LABELS: Record<LolRank, string> = {
  unranked: "Unranked",
  iron: "Iron",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  emerald: "Emerald",
  diamond: "Diamond",
  master: "Master",
  grandmaster: "Grandmaster",
  challenger: "Challenger",
};

// Rank colors — tailwind classes for bg and text
export const LOL_RANK_COLORS: Record<LolRank, { bg: string; text: string }> = {
  unranked:     { bg: "bg-gray-100 dark:bg-gray-800",       text: "text-gray-500 dark:text-gray-400" },
  iron:         { bg: "bg-stone-200 dark:bg-stone-800",     text: "text-stone-600 dark:text-stone-300" },
  bronze:       { bg: "bg-orange-100 dark:bg-orange-950",   text: "text-orange-700 dark:text-orange-400" },
  silver:       { bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-500 dark:text-slate-300" },
  gold:         { bg: "bg-yellow-100 dark:bg-yellow-950",   text: "text-yellow-700 dark:text-yellow-400" },
  platinum:     { bg: "bg-teal-100 dark:bg-teal-950",       text: "text-teal-700 dark:text-teal-400" },
  emerald:      { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400" },
  diamond:      { bg: "bg-blue-100 dark:bg-blue-950",       text: "text-blue-600 dark:text-blue-400" },
  master:       { bg: "bg-purple-100 dark:bg-purple-950",   text: "text-purple-700 dark:text-purple-400" },
  grandmaster:  { bg: "bg-red-100 dark:bg-red-950",         text: "text-red-700 dark:text-red-400" },
  challenger:   { bg: "bg-amber-100 dark:bg-amber-950",     text: "text-amber-600 dark:text-amber-400" },
};

// Role colors — subtle colored badges
export const LOL_ROLE_COLORS: Record<LolRole, { bg: string; text: string }> = {
  top:     { bg: "bg-red-100 dark:bg-red-950",     text: "text-red-700 dark:text-red-400" },
  jungle:  { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-400" },
  mid:     { bg: "bg-blue-100 dark:bg-blue-950",   text: "text-blue-700 dark:text-blue-400" },
  adc:     { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-400" },
  support: { bg: "bg-cyan-100 dark:bg-cyan-950",   text: "text-cyan-700 dark:text-cyan-400" },
  fill:    { bg: "bg-gray-100 dark:bg-gray-800",   text: "text-gray-600 dark:text-gray-400" },
};

export const LOL_SERVERS = [
  "euw",
  "eune",
  "na",
  "kr",
  "jp",
  "br",
  "las",
  "lan",
  "oce",
  "tr",
  "ru",
  "ph",
  "sg",
  "th",
  "tw",
  "vn",
] as const;
export type LolServer = (typeof LOL_SERVERS)[number];

export const LOL_SERVER_LABELS: Record<LolServer, string> = {
  euw: "EU West",
  eune: "EU Nordic & East",
  na: "North America",
  kr: "Korea",
  jp: "Japan",
  br: "Brazil",
  las: "Latin America South",
  lan: "Latin America North",
  oce: "Oceania",
  tr: "Turkey",
  ru: "Russia",
  ph: "Philippines",
  sg: "Singapore",
  th: "Thailand",
  tw: "Taiwan",
  vn: "Vietnam",
};

export const DEFAULT_TEAM_BUDGET = 15;
export const DEFAULT_PLAYER_VALUE = 3;
export const MIN_PLAYER_VALUE = 0;
export const MAX_PLAYER_VALUE = 7;

export function generateOpggUrl(gamertag: string, region: string): string {
  // Gamertag format: "Name#Tag" (Riot ID), region is separate
  const [name, tag] = gamertag.split("#").map((s) => s.trim());
  if (!name || !tag || !region) return "";
  const encodedName = encodeURIComponent(name);
  return `https://www.op.gg/summoners/${region.toLowerCase()}/${encodedName}-${tag}`;
}

export function generateMultiOpggUrl(
  gamertags: string[],
  region: string
): string {
  const summoners = gamertags
    .map((gt) => {
      const [name, tag] = gt.split("#").map((s) => s.trim());
      return name && tag ? `${name}#${tag}` : "";
    })
    .filter(Boolean)
    .join(",");
  return `https://www.op.gg/multisearch/${region.toLowerCase()}?summoners=${encodeURIComponent(summoners)}`;
}
