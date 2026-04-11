"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, ArrowRightLeft } from "lucide-react";

interface Team {
  id: string;
  name: string | null;
  tag: string | null;
  captain_name: string | null;
}

interface Group {
  id: string;
  name: string;
  display_order: number;
  teams: Team[];
}

interface GroupPreviewProps {
  tournamentId: string;
  groups: Group[];
  isOrganizer: boolean;
}

export function GroupPreview({
  tournamentId,
  groups: initialGroups,
  isOrganizer,
}: GroupPreviewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [groups, setGroups] = useState(initialGroups);
  const [moving, setMoving] = useState<string | null>(null);

  const moveTeam = async (
    teamId: string,
    fromGroupId: string,
    toGroupId: string
  ) => {
    if (fromGroupId === toGroupId) return;
    setMoving(teamId);

    // Update in database: delete old group_team, insert new one
    const { error: deleteErr } = await supabase
      .from("group_teams")
      .delete()
      .eq("group_id", fromGroupId)
      .eq("team_id", teamId);

    if (deleteErr) {
      setMoving(null);
      return;
    }

    const { error: insertErr } = await supabase
      .from("group_teams")
      .insert({ group_id: toGroupId, team_id: teamId });

    if (insertErr) {
      // Try to restore
      await supabase
        .from("group_teams")
        .insert({ group_id: fromGroupId, team_id: teamId });
      setMoving(null);
      return;
    }

    // Update local state
    setGroups((prev) => {
      const team = prev
        .find((g) => g.id === fromGroupId)
        ?.teams.find((t) => t.id === teamId);
      if (!team) return prev;

      return prev.map((g) => {
        if (g.id === fromGroupId) {
          return { ...g, teams: g.teams.filter((t) => t.id !== teamId) };
        }
        if (g.id === toGroupId) {
          return { ...g, teams: [...g.teams, team] };
        }
        return g;
      });
    });

    setMoving(null);
    router.refresh();
  };

  if (groups.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Group Preview
        {isOrganizer && (
          <span className="text-sm font-normal text-muted-foreground">
            — move teams between groups using the dropdown
          </span>
        )}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {group.teams.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No teams assigned
                </p>
              ) : (
                <div className="space-y-2">
                  {group.teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {team.name ?? "Unnamed Team"}
                            {team.tag && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                [{team.tag}]
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Captain: {team.captain_name ?? "?"}
                          </p>
                        </div>
                      </div>

                      {isOrganizer && groups.length > 1 && (
                        <Select
                          value={group.id}
                          onValueChange={(newGroupId) =>
                            moveTeam(team.id, group.id, newGroupId ?? group.id)
                          }
                          disabled={moving === team.id}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            {group.name}
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
