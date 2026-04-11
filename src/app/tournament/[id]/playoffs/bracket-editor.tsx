"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ArrowRightLeft } from "lucide-react";

interface Team {
  id: string;
  name: string | null;
  tag: string | null;
}

interface Round1Match {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  isCompleted: boolean;
}

interface BracketEditorProps {
  tournamentId: string;
  round1Matches: Round1Match[];
  teams: Team[];
  isOrganizer: boolean;
}

export function BracketEditor({
  tournamentId,
  round1Matches,
  teams,
  isOrganizer,
}: BracketEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Only show if organizer and there are editable (non-completed) round 1 matches
  const editableMatches = round1Matches.filter((m) => !m.isCompleted && m.teamAId && m.teamBId);
  if (!isOrganizer || editableMatches.length === 0) return null;

  // All team IDs currently in round 1
  const allRound1TeamIds = new Set(
    round1Matches.flatMap((m) => [m.teamAId, m.teamBId].filter(Boolean)) as string[]
  );

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const swapTeam = async (
    matchId: string,
    slot: "team_a_id" | "team_b_id",
    newTeamId: string
  ) => {
    setLoading(true);

    // Find current team in this slot
    const match = round1Matches.find((m) => m.matchId === matchId);
    if (!match) { setLoading(false); return; }

    const currentTeamId = slot === "team_a_id" ? match.teamAId : match.teamBId;
    if (currentTeamId === newTeamId) { setLoading(false); return; }

    // Find the other match that has newTeamId and swap
    const otherMatch = round1Matches.find(
      (m) =>
        m.matchId !== matchId &&
        (m.teamAId === newTeamId || m.teamBId === newTeamId)
    );

    // Update this match
    await supabase
      .from("matches")
      .update({ [slot]: newTeamId })
      .eq("id", matchId);

    // If swapping with another match, put the old team there
    if (otherMatch && currentTeamId) {
      const otherSlot =
        otherMatch.teamAId === newTeamId ? "team_a_id" : "team_b_id";
      await supabase
        .from("matches")
        .update({ [otherSlot]: currentTeamId })
        .eq("id", otherMatch.matchId);
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Edit Round 1 Matchups
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Swap teams between matches before they start. Selecting a team already in another match will swap them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {editableMatches.map((match, i) => {
          const teamA = match.teamAId ? teamMap.get(match.teamAId) : null;
          const teamB = match.teamBId ? teamMap.get(match.teamBId) : null;

          return (
            <div
              key={match.matchId}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <span className="text-xs text-muted-foreground w-16">
                Match {i + 1}
              </span>
              <Select
                value={match.teamAId ?? ""}
                onValueChange={(v) =>
                  swapTeam(match.matchId, "team_a_id", v ?? "")
                }
                disabled={loading}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  {teamA?.name ?? "TBD"}
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter((t) => allRound1TeamIds.has(t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name ?? "Unnamed"}
                        {t.tag ? ` [${t.tag}]` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">vs</span>
              <Select
                value={match.teamBId ?? ""}
                onValueChange={(v) =>
                  swapTeam(match.matchId, "team_b_id", v ?? "")
                }
                disabled={loading}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  {teamB?.name ?? "TBD"}
                </SelectTrigger>
                <SelectContent>
                  {teams
                    .filter((t) => allRound1TeamIds.has(t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name ?? "Unnamed"}
                        {t.tag ? ` [${t.tag}]` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
