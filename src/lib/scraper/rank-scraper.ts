import * as cheerio from "cheerio";

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
  // Higher index = lower rank, so invert. Unknown ranks get -1.
  return index === -1 ? -1 : RANK_NAMES.length - index;
}

/**
 * Scrapes player rank data from op.gg.
 * This is isolated so it can be swapped to Riot API if op.gg changes.
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
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    let currentRank = "unranked";
    let currentRankTier: string | null = null;

    // Strategy 1: Extract from medal image URLs (most reliable).
    // op.gg uses images like medals_new/platinum.png for rank icons.
    const medalImg = $('img[src*="medals_new"]').first().attr("src");
    if (medalImg) {
      const match = medalImg.match(/medals_new\/(\w+)\.png/);
      if (match) {
        const imgRank = match[1].toLowerCase();
        if (RANK_NAMES.includes(imgRank as (typeof RANK_NAMES)[number])) {
          currentRank = imgRank;
          // Look for the tier text (e.g. "platinum 1") near the image
          const tierText = $('img[src*="medals_new"]')
            .first()
            .parent()
            .parent()
            .text()
            .trim()
            .toLowerCase();
          const tierMatch = tierText.match(
            new RegExp(`${imgRank}\\s*([1-4])`)
          );
          currentRankTier = tierMatch ? tierMatch[1] : null;
        }
      }
    }

    // Strategy 2: Search the full HTML for rank patterns like "tier":"platinum 2"
    // op.gg embeds data in __NEXT_DATA__ / __next_f script chunks.
    if (currentRank === "unranked") {
      for (const rankName of RANK_NAMES) {
        // Match patterns like "platinum 1", "platinum 2", etc. in embedded JSON
        const pattern = new RegExp(
          `\\\\?"tier\\\\?"\\s*:\\s*\\\\?"(${rankName}(?:\\s*[1-4])?)"`,
          "i"
        );
        const jsonMatch = html.match(pattern);
        if (jsonMatch) {
          currentRank = rankName;
          const divisionMatch = jsonMatch[1].match(/(\d)/);
          currentRankTier = divisionMatch ? divisionMatch[1] : null;
          break;
        }
      }
    }

    // Find peak rank by scanning all tier values in embedded season/rank data.
    // op.gg embeds season history as "tier":"grandmaster" etc. in script chunks.
    // We match specifically quoted tier values to avoid matching UI strings.
    let peakRank = currentRank;
    let peakRankTier: string | null = currentRankTier;

    // Collect all tier values from embedded JSON.
    // op.gg embeds data in __next_f.push() with escaped quotes: \"tier\":\"diamond 1\"
    const tierPattern = /\\?"tier\\?"\s*:\\?\s*\\?"([\w\s]+?)\\?"/gi;
    let tierMatch: RegExpExecArray | null;
    while ((tierMatch = tierPattern.exec(html)) !== null) {
      const tierValue = tierMatch[1].toLowerCase().trim();
      for (const rankName of RANK_NAMES) {
        if (tierValue.startsWith(rankName)) {
          if (rankValue(rankName) > rankValue(peakRank)) {
            peakRank = rankName;
            const divMatch = tierValue.match(/(\d)/);
            peakRankTier = divMatch ? divMatch[1] : null;
          } else if (
            rankName === peakRank &&
            peakRankTier !== null
          ) {
            // Same rank — check if division is higher (lower number)
            const divMatch = tierValue.match(/(\d)/);
            if (
              divMatch &&
              parseInt(divMatch[1]) < parseInt(peakRankTier)
            ) {
              peakRankTier = divMatch[1];
            }
          }
          break;
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

