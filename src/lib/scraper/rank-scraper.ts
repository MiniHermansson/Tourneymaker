import * as cheerio from "cheerio";

interface RankData {
  currentRank: string;
  currentRankTier: string | null;
  peakRank: string;
  peakRankTier: string | null;
}

/**
 * Scrapes player rank data from op.gg.
 * This is isolated so it can be swapped to Riot API if op.gg changes.
 */
export async function scrapePlayerRank(
  gamertag: string
): Promise<RankData | null> {
  try {
    const [name, tag] = gamertag.split("#").map((s) => s.trim());
    if (!name || !tag) return null;

    const region = tag.toLowerCase();
    const encodedName = encodeURIComponent(name);
    const url = `https://www.op.gg/summoners/${region}/${encodedName}-${tag}`;

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

    // op.gg rank info is in various elements - these selectors may need updates
    let currentRankTier: string | null = null;
    let currentRank = "unranked";

    // Try to find rank info from the page
    const rankElement = $('[class*="tier"]').first().text().trim();
    if (rankElement) {
      currentRankTier = rankElement;
      currentRank = extractRankFromTier(rankElement);
    }

    return {
      currentRank,
      currentRankTier,
      peakRank: currentRank, // op.gg doesn't easily expose peak rank
      peakRankTier: currentRankTier,
    };
  } catch {
    return null;
  }
}

function extractRankFromTier(tier: string): string {
  const rankMap: Record<string, string> = {
    iron: "iron",
    bronze: "bronze",
    silver: "silver",
    gold: "gold",
    platinum: "platinum",
    emerald: "emerald",
    diamond: "diamond",
    master: "master",
    grandmaster: "grandmaster",
    challenger: "challenger",
  };

  const lower = tier.toLowerCase();
  for (const [key, value] of Object.entries(rankMap)) {
    if (lower.includes(key)) return value;
  }

  return "unranked";
}
