import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Users } from "lucide-react";
import { GroupPreview } from "./group-preview";

interface TeamsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
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

  const { data: teams } = await supabase
    .from("teams")
    .select(
      "*, profiles!teams_captain_id_fkey(*), team_members(*, profiles(*))"
    )
    .eq("tournament_id", id)
    .order("created_at");

  // Get groups with their team assignments
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, display_order, group_teams(team_id)")
    .eq("tournament_id", id)
    .order("display_order");

  // Build group data with team info for the preview
  const groupsWithTeams = (groups ?? []).map((group) => {
    const groupTeamIds = (
      group.group_teams as Array<{ team_id: string }>
    ).map((gt) => gt.team_id);

    const groupTeams = groupTeamIds
      .map((teamId) => {
        const team = teams?.find((t) => t.id === teamId);
        if (!team) return null;
        const captain = team.profiles as Record<string, unknown> | null;
        return {
          id: team.id,
          name: team.name,
          tag: team.tag,
          captain_name: (captain?.discord_username as string) ?? null,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string | null;
      tag: string | null;
      captain_name: string | null;
    }>;

    return {
      id: group.id,
      name: group.name,
      display_order: group.display_order,
      teams: groupTeams,
    };
  });

  return (
    <div className="space-y-8">
      {groupsWithTeams.length > 0 && (
        <GroupPreview
          tournamentId={id}
          groups={groupsWithTeams}
          isOrganizer={isOrganizer}
        />
      )}

      <h2 className="text-lg font-semibold mb-4">Teams</h2>

      {!teams || teams.length === 0 ? (
        <p className="text-muted-foreground">No teams formed yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => {
            const captain = team.profiles as Record<string, unknown> | null;
            const members = (team.team_members ?? []) as Array<{
              user_id: string;
              assigned_role: string | null;
              draft_value: number | null;
              is_substitute: boolean;
              profiles: Record<string, unknown>;
            }>;

            return (
              <Link key={team.id} href={`/tournament/${id}/teams/${team.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={team.logo_url} />
                          <AvatarFallback>
                            {(team.tag ?? team.name ?? "T").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">
                          {team.name ?? `Team ${(captain?.discord_username as string) ?? "?"}`}
                          {team.tag && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              [{team.tag}]
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Captain: {(captain?.discord_username as string) ?? "Unknown"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {members.map((m) => {
                        const p = m.profiles;
                        return (
                          <div
                            key={m.user_id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className={m.is_substitute ? "text-muted-foreground" : ""}>
                              {(p?.discord_username as string) ?? "Unknown"}
                              {m.is_substitute && (
                                <span className="text-xs ml-1">(Sub)</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {m.assigned_role ?? "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {team.multi_opgg_url && (
                      <a
                        href={team.multi_opgg_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        Multi-op.gg <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
