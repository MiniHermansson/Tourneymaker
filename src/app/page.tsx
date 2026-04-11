import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/rank-badge";
import {
  Trophy,
  ArrowRight,
  ExternalLink,
  User,
  Award,
  Calendar,
} from "lucide-react";
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
  type LolRank,
} from "@/lib/constants";
import type { Database } from "@/lib/types/database";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type TournamentResult = Database["public"]["Tables"]["tournament_results"]["Row"];
type TournamentWithResults = Tournament & { tournament_results: TournamentResult[] };

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user: SupabaseUser | null = null;
  let profile: Profile | null = null;
  let activeTournament: Tournament | null = null;
  let openTournaments: Tournament[] = [];
  let pastTournaments: TournamentWithResults[] = [];
  let userRegistrationIds = new Set<string>();
  let userTeamByTournament = new Map<string, string>();

  try {
    const supabase = await createClient();

    // Batch 1: auth + active tournament (parallel)
    const [authResult, activeTournamentResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("tournaments")
        .select("*")
        .not("status", "eq", "archived")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    user = authResult.data?.user ?? null;
    activeTournament = activeTournamentResult.data;

    // Batch 2: logged-in user data (parallel)
    if (user) {
      const [profileResult, registrationsResult, openResult, teamMembersResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single(),
          supabase
            .from("registrations")
            .select("tournament_id")
            .eq("user_id", user.id),
          supabase
            .from("tournaments")
            .select("*")
            .eq("status", "registration")
            .order("created_at", { ascending: false }),
          supabase
            .from("team_members")
            .select("team_id, teams(tournament_id)")
            .eq("user_id", user.id),
        ]);

      profile = profileResult.data;
      openTournaments = openResult.data ?? [];

      const regIds = registrationsResult.data?.map((r) => r.tournament_id) ?? [];
      userRegistrationIds = new Set(regIds);

      // Build tournament -> team map for placement lookup
      for (const m of teamMembersResult.data ?? []) {
        const teams = m.teams as unknown as { tournament_id: string } | null;
        if (teams?.tournament_id) {
          userTeamByTournament.set(teams.tournament_id, m.team_id);
        }
      }

      // Batch 3: past tournaments (depends on registration IDs)
      if (regIds.length > 0) {
        const { data } = await supabase
          .from("tournaments")
          .select("*, tournament_results(*)")
          .in("id", regIds)
          .eq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(10);

        pastTournaments = data ?? [];
      }
    }
  } catch {
    // Supabase not configured yet
  }

  const isLoggedIn = !!user && !!profile;

  // Not logged in and no active tournament — show sign-in card
  if (!isLoggedIn && !activeTournament) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Trophy className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">TourneyMaker</CardTitle>
            <CardDescription>
              No tournaments are currently active. Check back soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to get placement for a past tournament
  function getPlacement(tournament: TournamentWithResults) {
    const results = tournament.tournament_results?.[0];
    if (!results) return null;
    const userTeamId = userTeamByTournament.get(tournament.id);
    if (!userTeamId) return null;
    if (userTeamId === results.first_place_id) return "1st";
    if (userTeamId === results.second_place_id) return "2nd";
    if (userTeamId === results.third_place_id) return "3rd";
    return null;
  }

  function isMvp(tournament: TournamentWithResults) {
    const results = tournament.tournament_results?.[0];
    return results?.mvp_user_id === user?.id;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">TourneyMaker</h1>
        {profile ? (
          <p className="text-muted-foreground">
            Welcome back, {profile.discord_username}
          </p>
        ) : (
          <p className="text-muted-foreground">
            League of Legends Tournament Management
          </p>
        )}
      </div>

      {/* Player Card (logged in only) */}
      {profile && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  {profile.lol_gamertag ? (
                    <>
                      <CardTitle className="text-lg">
                        {profile.lol_gamertag}
                      </CardTitle>
                      <CardDescription>
                        {profile.discord_username}
                      </CardDescription>
                    </>
                  ) : (
                    <CardTitle className="text-lg">
                      {profile.discord_username}
                    </CardTitle>
                  )}
                </div>
              </div>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardHeader>
          {profile.lol_gamertag ? (
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                {profile.current_rank && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">Current:</span>
                    <RankBadge
                      rank={profile.current_rank as LolRank}
                      tier={profile.current_rank_tier}
                    />
                  </div>
                )}
                {profile.peak_rank && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">Peak:</span>
                    <RankBadge
                      rank={profile.peak_rank as LolRank}
                      tier={profile.peak_rank_tier}
                    />
                  </div>
                )}
                {profile.opgg_url && (
                  <a
                    href={profile.opgg_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    op.gg
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete your profile to get started with tournaments.
              </p>
              <Link href="/profile" className="mt-2 inline-block">
                <Button size="sm">Set Up Profile</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      )}

      {/* Active Tournament */}
      {activeTournament && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {activeTournament.name}
                </CardTitle>
                {activeTournament.description && (
                  <CardDescription className="mt-1">
                    {activeTournament.description}
                  </CardDescription>
                )}
              </div>
              <Badge
                variant={
                  activeTournament.status === "results"
                    ? "default"
                    : "secondary"
                }
                className="text-sm"
              >
                {TOURNAMENT_STATUS_LABELS[activeTournament.status as TournamentStatus]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/tournament/${activeTournament.id}`}>
                <Button>
                  View Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {activeTournament.status === "registration" && (
                <Link
                  href={`/tournament/${activeTournament.id}/register`}
                >
                  <Button variant="outline">Register Now</Button>
                </Link>
              )}
              {activeTournament.status === "results" && (
                <Link
                  href={`/tournament/${activeTournament.id}/results`}
                >
                  <Button variant="outline">View Results</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign in prompt for non-logged-in users viewing a tournament */}
      {!isLoggedIn && !!activeTournament && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline hover:text-foreground">
            Sign in
          </Link>{" "}
          for a personalized experience.
        </p>
      )}

      {/* Open Tournaments (logged in, shown when no active tournament or as extra section) */}
      {isLoggedIn && openTournaments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Open Tournaments
          </h2>
          <div className="space-y-3">
            {openTournaments.map((t) => {
              const isRegistered = userRegistrationIds.has(t.id);
              // Skip if this is already shown as the active tournament
              if (t.id === activeTournament?.id) return null;
              return (
                <Card key={t.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {t.name}
                        </CardTitle>
                        {t.description && (
                          <CardDescription className="mt-0.5 text-sm">
                            {t.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isRegistered ? (
                          <Badge variant="secondary">Registered</Badge>
                        ) : (
                          <Link href={`/tournament/${t.id}/register`}>
                            <Button size="sm" variant="outline">
                              Register
                            </Button>
                          </Link>
                        )}
                        <Link href={`/tournament/${t.id}`}>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* No open tournaments message */}
      {isLoggedIn && !activeTournament && openTournaments.length === 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Open Tournaments
          </h2>
          <p className="text-sm text-muted-foreground">
            No tournaments are open for registration right now.
          </p>
        </section>
      )}

      {/* Past Tournament History (logged in only) */}
      {isLoggedIn && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Tournament History
          </h2>
          {pastTournaments.length > 0 ? (
            <div className="space-y-3">
              {pastTournaments.map((t) => {
                const placement = getPlacement(t);
                const mvp = isMvp(t);
                const date = new Date(t.created_at).toLocaleDateString(
                  undefined,
                  { year: "numeric", month: "short" }
                );
                return (
                  <Card key={t.id}>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {t.name}
                          </CardTitle>
                          <CardDescription className="mt-0.5 text-sm">
                            {date}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {placement && (
                            <Badge
                              variant={placement === "1st" ? "default" : "secondary"}
                            >
                              {placement}
                            </Badge>
                          )}
                          {mvp && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
                              MVP
                            </Badge>
                          )}
                          {!placement && !mvp && (
                            <span className="text-sm text-muted-foreground">
                              Participated
                            </span>
                          )}
                          <Link href={`/tournament/${t.id}/results`}>
                            <Button size="sm" variant="ghost">
                              Results
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t participated in any tournaments yet.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
