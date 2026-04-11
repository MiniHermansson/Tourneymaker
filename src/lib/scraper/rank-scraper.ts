interface RankData {
  currentRank: string;
  currentRankTier: string | null;
  peakRank: string;
  peakRankTier: string | null;
}

const RANK_NAMES = [
  "challenger",
  "grandmaster",
  "master",
  "diamond",
  "emerald",
  "platinum",
  "gold",
  "silver",
  "bronze",
  "iron",
] as const;

function rankValue(rank: string): number {
  const index = RANK_NAMES.indexOf(rank as (typeof RANK_NAMES)[number]);
  return index === -1 ? -1 : RANK_NAMES.length - index;
}

function parseTier(tierStr: string): { rank: string; division: string | null } | null {
  const lower = tierStr.toLowerCase().trim();
  if (!lower) return null;
  for (const rankName of RANK_NAMES) {
    if (lower.startsWith(rankName)) {
      const divMatch = lower.match(/(\d)/);
      return { rank: rankName, division: divMatch ? divMatch[1] : null };
    }
  }
  return null;
}

/**
 * Scrapes player rank data from op.gg.
 *
 * Current rank: extracted from the rendered HTML — the first
 *   medals_new/<rank>.png is the Solo/Duo badge, followed by a <strong>
 *   element with the tier text (e.g. "gold 4").
 *
 * Peak rank: extracted from serialized React data in script tags.
 *   Each season has rank_entries with high_rank_info (season peak) and
 *   rank_info (end-of-season rank). We scan Solo/Duo entries only,
 *   bounded by "Ranked Solo/Duo" and "Ranked Flex" markers.
 */
export async function scrapePlayerRank(
  gamertag: string,
  region: string
): Promise<RankData | null> {
  try {
    const [name, tag] = gamertag.split("#").map((s) => s.trim());
    if (!name || !tag || !region) return null;

    const encodedName = encodeURIComponent(name);
    const url = `https://www.op.gg/summoners/${region.toLowerCase()}/${encodedName}-${tag}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();

    // --- Current rank from rendered HTML ---
    // The first medals_new image is Solo/Duo, followed by tier text in a
    // <strong> tag like: <strong class="...">gold 4</strong>
    let currentRank = "unranked";
    let currentRankTier: string | null = null;

    const medalNewMatch = html.match(/medals_new\/(\w+)\.png/);
    if (medalNewMatch) {
      // Look for the <strong> tier text after the medal image
      const afterMedal = html.slice(
        medalNewMatch.index!,
        medalNewMatch.index! + 500
      );
      const strongMatch = afterMedal.match(
        /<strong[^>]*>([^<]+)<\/strong>/
      );
      if (strongMatch) {
        const parsed = parseTier(strongMatch[1]);
        if (parsed) {
          currentRank = parsed.rank;
          currentRankTier = parsed.division;
        }
      }
    }

    // --- Peak rank from serialized script data ---
    // Find Solo/Duo section boundaries using last occurrences of markers
    const soloStart = html.lastIndexOf("Ranked Solo/Duo");
    const flexStart = html.lastIndexOf("Ranked Flex");

    const soloSection =
      soloStart !== -1 && flexStart !== -1 && flexStart > soloStart
        ? html.slice(soloStart, flexStart)
        : soloStart !== -1
          ? html.slice(soloStart)
          : html;

    // Extract all rank_info tier values from solo section.
    // These include both high_rank_info (season peak) and rank_info
    // (end-of-season), giving us the full history to find the all-time peak.
    // Pattern: rank_info\\\":{\\\"tier\\\":\\\"gold 4\\\"
    const tierRegex = /rank_info\\":\{\\"tier\\":\\"([^"\\]+)\\"/g;
    let peakRank = currentRank;
    let peakRankTier: string | null = currentRankTier;

    let match: RegExpExecArray | null;
    while ((match = tierRegex.exec(soloSection)) !== null) {
      const parsed = parseTier(match[1]);
      if (!parsed) continue;

      if (rankValue(parsed.rank) > rankValue(peakRank)) {
        peakRank = parsed.rank;
        peakRankTier = parsed.division;
      } else if (parsed.rank === peakRank && peakRankTier !== null && parsed.division) {
        if (parseInt(parsed.division) < parseInt(peakRankTier)) {
          peakRankTier = parsed.division;
        }
      }
    }

    return {
      currentRank,
      currentRankTier,
      peakRank,
      peakRankTier,
    };
  } catch {
    return null;
  }
}
