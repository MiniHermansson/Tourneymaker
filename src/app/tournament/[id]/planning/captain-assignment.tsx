"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, X } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";
import { type LolRole } from "@/lib/constants";

interface Registration {
  id: string;
  user_id: string;
  wants_captain: boolean;
  main_role: string;
  profiles: Record<string, unknown>;
}

interface Team {
  id: string;
  captain_id: string | null;
  name: string | null;
  profiles: Record<string, unknown> | null;
}

interface CaptainAssignmentProps {
  tournamentId: string;
  registrations: Registration[];
  teams: Team[];
  disabled: boolean;
  teamBudget: number;
}

export function CaptainAssignment({
  tournamentId,
  registrations,
  teams,
  disabled,
  teamBudget,
}: CaptainAssignmentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const captainIds = new Set(teams.map((t) => t.captain_id).filter(Boolean));
  const wantsCaptain = registrations.filter((r) => r.wants_captain);

  const assignCaptain = async (userId: string) => {
    setLoading(true);

    // Get the captain's draft value if set
    const { data: draftValue } = await supabase
      .from("draft_player_values")
      .select("value")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .single();

    const captainValue = draftValue?.value ?? 0;

    // Create a team with this user as captain, deducting their value from budget
    const { error } = await supabase.from("teams").insert({
      tournament_id: tournamentId,
      captain_id: userId,
      budget_remaining: teamBudget - captainValue,
    });

    if (!error) {
      // Also add the captain as a team member
      const { data: team } = await supabase
        .from("teams")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("captain_id", userId)
        .single();

      if (team) {
        await supabase.from("team_members").insert({
          team_id: team.id,
          user_id: userId,
          draft_value: captainValue,
          draft_pick_order: 0,
        });
      }
    }

    setLoading(false);
    router.refresh();
  };

  const removeCaptain = async (teamId: string) => {
    setLoading(true);
    await supabase.from("team_members").delete().eq("team_id", teamId);
    await supabase.from("teams").delete().eq("id", teamId);
    setLoading(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Captain Assignment
        </CardTitle>
        <CardDescription>
          Assign captains for the draft. Players who volunteered are highlighted.
          Each captain creates a team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {teams.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Assigned Captains ({teams.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => {
                const captain = team.profiles as Record<string, unknown> | null;
                return (
                  <Badge
                    key={team.id}
                    variant="default"
                    className="flex items-center gap-1 py-1 px-3"
                  >
                    {(captain?.discord_username as string) ?? "Unknown"}
                    {!disabled && (
                      <button
                        onClick={() => removeCaptain(team.id)}
                        disabled={loading}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">Available Players</h4>
          <div className="space-y-1">
            {registrations
              .filter((r) => !captainIds.has(r.user_id))
              .map((reg) => {
                const p = reg.profiles;
                return (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {(p?.discord_username as string) ?? "Unknown"}
                      </span>
                      <RoleBadge role={reg.main_role as LolRole} />
                      {reg.wants_captain && (
                        <Badge variant="secondary" className="text-xs">
                          Wants Captain
                        </Badge>
                      )}
                    </div>
                    {!disabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assignCaptain(reg.user_id)}
                        disabled={loading}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
