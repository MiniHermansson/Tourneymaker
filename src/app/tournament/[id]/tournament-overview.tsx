"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
  type TournamentFormat,
} from "@/lib/constants";
import {
  canAdvance,
  getNextStatus,
  type TournamentData,
} from "@/lib/tournament/state-machine";
import { ArrowRight, Users, Shield } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

interface TournamentOverviewProps {
  tournament: Tournament;
  isOrganizer: boolean;
  registrationCount: number;
  teamCount: number;
  captainsAssigned: number;
  allPlayerValuesSet: boolean;
  allDraftPicksCompleted: boolean;
  allTeamsNamed: boolean;
  allGroupsHaveTeams: boolean;
  allGroupMatchesCompleted: boolean;
  allPlayoffMatchesCompleted: boolean;
}

export function TournamentOverview({
  tournament,
  isOrganizer,
  registrationCount,
  teamCount,
  captainsAssigned,
  allPlayerValuesSet,
  allDraftPicksCompleted,
  allTeamsNamed,
  allGroupsHaveTeams,
  allGroupMatchesCompleted,
  allPlayoffMatchesCompleted,
}: TournamentOverviewProps) {
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");

  const status = tournament.status as TournamentStatus;
  const format = tournament.format as TournamentFormat;

  const tournamentData: TournamentData = {
    id: tournament.id,
    status,
    format,
    name: tournament.name,
    group_size: tournament.group_size,
    group_count: tournament.group_count,
    playoff_type: tournament.playoff_type,
    team_budget: tournament.team_budget,
    registrationCount,
    captainsAssigned,
    allPlayerValuesSet,
    allDraftPicksCompleted,
    allTeamsNamed,
    allGroupsHaveTeams,
    allGroupMatchesCompleted,
    allPlayoffMatchesCompleted,
  };

  const nextStatus = getNextStatus(tournamentData);
  const advanceResult = canAdvance(tournamentData);

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setAdvancing(true);
    setError("");

    const response = await fetch(
      `/api/tournament/${tournament.id}/advance`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to advance tournament");
      setAdvancing(false);
      return;
    }

    router.refresh();
    setAdvancing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {TOURNAMENT_STATUS_LABELS[status]}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered Players</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{registrationCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{teamCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span>
                {format === "captains_draft" ? "Captains Draft" : "Premade Teams"}
              </span>
            </div>
            {tournament.group_count && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groups</span>
                <span>
                  {tournament.group_count} groups of {tournament.group_size}
                </span>
              </div>
            )}
            {tournament.playoff_type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Playoff</span>
                <span>
                  {tournament.playoff_type === "single_elimination"
                    ? "Single Elimination"
                    : "Double Elimination"}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group BO</span>
              <span>{tournament.group_bo_format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Playoff BO</span>
              <span>{tournament.playoff_bo_format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Finals BO</span>
              <span>{tournament.finals_bo_format.toUpperCase()}</span>
            </div>
            {format === "captains_draft" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Budget</span>
                <span>{tournament.team_budget}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isOrganizer && nextStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Advance Tournament</CardTitle>
            <CardDescription>
              Move to the next stage:{" "}
              <Badge variant="outline">
                {TOURNAMENT_STATUS_LABELS[nextStatus]}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!advanceResult.allowed && (
              <p className="text-sm text-destructive mb-3">
                {advanceResult.error}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}
            <Button
              onClick={handleAdvance}
              disabled={!advanceResult.allowed || advancing}
            >
              {advancing ? "Advancing..." : (
                <>
                  Advance to {TOURNAMENT_STATUS_LABELS[nextStatus]}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
