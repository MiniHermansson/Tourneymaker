import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOL_RANKS, LOL_ROLES } from "@/lib/constants";

const PLAYABLE_RANKS = LOL_RANKS.filter((r) => r !== "unranked");
const PLAYABLE_ROLES = LOL_ROLES.filter((r) => r !== "fill");

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTier(rank: string): string | null {
  // Master+ ranks don't have tiers
  if (["master", "grandmaster", "challenger"].includes(rank)) return null;
  return randomItem(["I", "II", "III", "IV"]);
}

export async function POST(request: Request) {
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

  const { tournamentId, count } = await request.json();

  if (!tournamentId || !count || count < 1 || count > 50) {
    return NextResponse.json(
      { error: "Invalid tournamentId or count (1-50)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Get all existing test players
  const { data: testPlayers } = await admin
    .from("profiles")
    .select("id, discord_username")
    .like("discord_username", "TestPlayer_%");

  const allTestPlayerIds = (testPlayers ?? []).map((p) => p.id);

  // Find which test players are already registered for this tournament
  const { data: existingRegs } = await admin
    .from("registrations")
    .select("user_id")
    .eq("tournament_id", tournamentId)
    .in("user_id", allTestPlayerIds.length > 0 ? allTestPlayerIds : ["none"]);

  const registeredIds = new Set((existingRegs ?? []).map((r) => r.user_id));
  const availableTestPlayers = (testPlayers ?? []).filter(
    (p) => !registeredIds.has(p.id)
  );

  // Determine how many new test players we need to create
  const needed = count - availableTestPlayers.length;
  const newPlayerIds: string[] = [];

  if (needed > 0) {
    // Find the highest existing test player number
    let maxIndex = 0;
    for (const p of testPlayers ?? []) {
      const match = p.discord_username.match(/^TestPlayer_(\d+)$/);
      if (match) maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
    }

    // Create new test players
    for (let i = 0; i < needed; i++) {
      const index = maxIndex + 1 + i;
      const { data: newUser, error: createError } =
        await admin.auth.admin.createUser({
          email: `testplayer_${index}@test.local`,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            provider_id: `test_${index}`,
            full_name: `TestPlayer_${index}`,
          },
        });

      if (createError || !newUser.user) {
        console.error(`Failed to create test player ${index}:`, createError);
        continue;
      }

      // Update profile with LoL data
      const rank = randomItem(PLAYABLE_RANKS);
      await admin
        .from("profiles")
        .update({
          lol_gamertag: `TestPlayer${index}#TEST`,
          lol_region: "euw",
          current_rank: rank,
          current_rank_tier: randomTier(rank),
        })
        .eq("id", newUser.user.id);

      newPlayerIds.push(newUser.user.id);
    }
  }

  // Select test players to register
  const toRegister = [
    ...availableTestPlayers.map((p) => p.id),
    ...newPlayerIds,
  ].slice(0, count);

  // Fetch profiles for the players we're about to register
  const { data: playerProfiles } = await admin
    .from("profiles")
    .select("id, current_rank, current_rank_tier")
    .in("id", toRegister);

  const profileMap = new Map(
    (playerProfiles ?? []).map((p) => [p.id, p])
  );

  // Build registration rows
  const registrations = toRegister.map((userId) => {
    const mainRole = randomItem(PLAYABLE_ROLES);
    let secondaryRole = randomItem(PLAYABLE_ROLES);
    while (secondaryRole === mainRole) {
      secondaryRole = randomItem(PLAYABLE_ROLES);
    }
    const p = profileMap.get(userId);
    return {
      tournament_id: tournamentId,
      user_id: userId,
      main_role: mainRole,
      secondary_role: secondaryRole,
      wants_captain: false,
      willing_substitute: false,
      rank_at_registration: p?.current_rank ?? "unranked",
      rank_tier_at_registration: p?.current_rank_tier ?? null,
    };
  });

  if (registrations.length > 0) {
    const { error: regError } = await admin
      .from("registrations")
      .insert(registrations);

    if (regError) {
      return NextResponse.json({ error: regError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    created: newPlayerIds.length,
    registered: registrations.length,
  });
}
