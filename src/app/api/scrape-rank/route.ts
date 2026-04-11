import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapePlayerRank } from "@/lib/scraper/rank-scraper";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gamertag, userId } = await request.json();

  // Only allow scraping own rank or if organizer
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .single();

  if (userId !== user.id && !profile?.is_organizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rankData = await scrapePlayerRank(gamertag);

  if (!rankData) {
    return NextResponse.json(
      { error: "Could not fetch rank data" },
      { status: 404 }
    );
  }

  // Update the profile
  const { error } = await supabase
    .from("profiles")
    .update({
      current_rank: rankData.currentRank,
      current_rank_tier: rankData.currentRankTier,
      peak_rank: rankData.peakRank,
      peak_rank_tier: rankData.peakRankTier,
      rank_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rank: rankData });
}
