import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GroupsPageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupsPage({ params }: GroupsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("*, group_teams(*, teams(*))")
    .eq("tournament_id", id)
    .order("display_order");

  const { data: matches } = await supabase
    .from("matches")
    .select("*, teams!matches_team_a_id_fkey(*)")
    .eq("tournament_id", id)
    .eq("stage", "group")
    .order("round")
    .order("created_at");

  // Also fetch team_b names
  const { data: matchesWithTeamB } = await supabase
    .from("matches")
    .select("id, team_b_id, teams!matches_team_b_id_fkey(name, tag)")
    .eq("tournament_id", id)
    .eq("stage", "group");

  const teamBMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matchesWithTeamB ?? []).map((m: any) => [
      m.id,
      m.teams as Record<string, unknown> | null,
    ])
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Group Stage</h2>

      {!groups || groups.length === 0 ? (
        <p className="text-muted-foreground">
          Groups have not been created yet.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {groups.map((group) => {
            const groupTeams = (group.group_teams ?? []) as Array<{
              team_id: string;
              wins: number;
              losses: number;
              map_wins: number;
              map_losses: number;
              points: number;
              seed_position: number | null;
              teams: Record<string, unknown>;
            }>;

            // Sort by points, then map diff
            const sorted = [...groupTeams].sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              const diffA = a.map_wins - a.map_losses;
              const diffB = b.map_wins - b.map_losses;
              return diffB - diffA;
            });

            const groupMatches = (matches ?? []).filter(
              (m) => m.group_id === group.id
            );

            return (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Standings Table */}
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-medium">#</th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            Team
                          </th>
                          <th className="px-3 py-1.5 text-center font-medium">
                            W
                          </th>
                          <th className="px-3 py-1.5 text-center font-medium">
                            L
                          </th>
                          <th className="px-3 py-1.5 text-center font-medium">
                            Pts
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((gt, i) => {
                          const t = gt.teams as Record<string, unknown>;
                          return (
                            <tr key={gt.team_id} className="border-b">
                              <td className="px-3 py-1.5 text-muted-foreground">
                                {i + 1}
                              </td>
                              <td className="px-3 py-1.5 font-medium">
                                <Link
                                  href={`/tournament/${id}/teams/${gt.team_id}`}
                                  className="hover:underline"
                                >
                                  {(t?.name as string) ?? "Unnamed"}
                                  {(t?.tag as string) && (
                                    <span className="text-muted-foreground ml-1 text-xs">
                                      [{t.tag as string}]
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {gt.wins}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {gt.losses}
                              </td>
                              <td className="px-3 py-1.5 text-center font-semibold">
                                {gt.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Matches */}
                  {groupMatches.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase">
                        Matches
                      </h4>
                      {groupMatches.map((match) => {
                        const teamA = match.teams as Record<
                          string,
                          unknown
                        > | null;
                        const teamB = teamBMap.get(match.id);

                        return (
                          <Link
                            key={match.id}
                            href={`/tournament/${id}/match/${match.id}`}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                          >
                            <span className="font-medium">
                              {(teamA?.name as string) ?? "TBD"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {match.is_completed ? (
                                <Badge
                                  variant={
                                    match.is_disputed
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {match.team_a_score} - {match.team_b_score}
                                </Badge>
                              ) : (
                                "vs"
                              )}
                            </span>
                            <span className="font-medium">
                              {(teamB?.name as string) ?? "TBD"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
