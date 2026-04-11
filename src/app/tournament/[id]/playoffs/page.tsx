import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BracketEditor } from "./bracket-editor";

interface PlayoffsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayoffsPage({ params }: PlayoffsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOrganizer = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_organizer")
      .eq("id", user.id)
      .single();
    isOrganizer = profile?.is_organizer ?? false;
  }

  const { data: bracketSlots } = await supabase
    .from("playoff_bracket_slots")
    .select("*, matches(*)")
    .eq("tournament_id", id)
    .order("round")
    .order("slot_index");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, tag")
    .eq("tournament_id", id);

  const teamMap = new Map(teams?.map((t) => [t.id, t]) ?? []);

  if (!bracketSlots || bracketSlots.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Playoffs</h2>
        <p className="text-muted-foreground">
          Playoff bracket has not been generated yet.
        </p>
      </div>
    );
  }

  // Build round 1 match data for the editor
  const round1Matches = (bracketSlots ?? [])
    .filter((s) => s.round === 1)
    .map((s) => {
      const match = s.matches as Record<string, unknown> | null;
      return {
        matchId: (match?.id as string) ?? "",
        teamAId: (match?.team_a_id as string) ?? null,
        teamBId: (match?.team_b_id as string) ?? null,
        isCompleted: (match?.is_completed as boolean) ?? false,
      };
    })
    .filter((m) => m.matchId);

  // Group by rounds
  const rounds = new Map<number, typeof bracketSlots>();
  for (const slot of bracketSlots) {
    const roundSlots = rounds.get(slot.round) ?? [];
    roundSlots.push(slot);
    rounds.set(slot.round, roundSlots);
  }

  const maxRound = Math.max(...Array.from(rounds.keys()));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Playoff Bracket</h2>

      <BracketEditor
        tournamentId={id}
        round1Matches={round1Matches}
        teams={teams ?? []}
        isOrganizer={isOrganizer}
      />

      <div className="flex gap-6 overflow-x-auto pb-4">
        {Array.from(rounds.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, slots]) => {
            const roundLabel =
              round === maxRound
                ? "Finals"
                : round === maxRound - 1
                  ? "Semifinals"
                  : `Round ${round}`;

            return (
              <div key={round} className="flex-shrink-0 w-64">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {roundLabel}
                </h3>
                <div
                  className="space-y-4"
                  style={{
                    paddingTop: `${Math.pow(2, round - 1) * 0.5}rem`,
                  }}
                >
                  {slots.map((slot) => {
                    const match = slot.matches as Record<
                      string,
                      unknown
                    > | null;
                    const teamAId = match?.team_a_id as string | null;
                    const teamBId = match?.team_b_id as string | null;
                    const tA = teamAId ? teamMap.get(teamAId) : null;
                    const tB = teamBId ? teamMap.get(teamBId) : null;
                    const winnerId = match?.winner_id as string | null;
                    const isCompleted = match?.is_completed as boolean;
                    const matchId = match?.id as string | null;

                    return (
                      <Card key={slot.id} className="w-full">
                        <CardContent className="p-3">
                          {matchId ? (
                            <Link
                              href={`/tournament/${id}/match/${matchId}`}
                              className="block hover:opacity-80 transition-opacity"
                            >
                              <div className="space-y-1">
                                <div
                                  className={`flex items-center justify-between text-sm ${
                                    winnerId === teamAId
                                      ? "font-bold"
                                      : winnerId && winnerId !== teamAId
                                        ? "text-muted-foreground"
                                        : ""
                                  }`}
                                >
                                  <span>
                                    {tA?.name ?? "TBD"}
                                    {tA?.tag && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        [{tA.tag}]
                                      </span>
                                    )}
                                  </span>
                                  {isCompleted && (
                                    <span>{(match?.team_a_score as number) ?? 0}</span>
                                  )}
                                </div>
                                <div
                                  className={`flex items-center justify-between text-sm ${
                                    winnerId === teamBId
                                      ? "font-bold"
                                      : winnerId && winnerId !== teamBId
                                        ? "text-muted-foreground"
                                        : ""
                                  }`}
                                >
                                  <span>
                                    {tB?.name ?? "TBD"}
                                    {tB?.tag && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        [{tB.tag}]
                                      </span>
                                    )}
                                  </span>
                                  {isCompleted && (
                                    <span>{(match?.team_b_score as number) ?? 0}</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-2">
                              TBD
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
