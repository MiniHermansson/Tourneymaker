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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Match = Database["public"]["Tables"]["matches"]["Row"];
type Team = Database["public"]["Tables"]["teams"]["Row"];
type MatchGame = Database["public"]["Tables"]["match_games"]["Row"];

interface MatchReportProps {
  match: Match;
  teamA: Team | null;
  teamB: Team | null;
  games: MatchGame[];
  tournamentId: string;
  isOrganizer: boolean;
  isCaptainA: boolean;
  isCaptainB: boolean;
  userId: string;
}

export function MatchReport({
  match,
  teamA,
  teamB,
  games,
  tournamentId,
  isOrganizer,
  isCaptainA,
  isCaptainB,
}: MatchReportProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [reportedWinner, setReportedWinner] = useState<string>("");
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([""]);
  const [message, setMessage] = useState("");

  const canReport = (isCaptainA || isCaptainB) && !match.is_completed;
  const maxGames = match.bo_format === "bo5" ? 5 : match.bo_format === "bo3" ? 3 : 1;

  const handleReportWinner = async () => {
    if (!reportedWinner) return;
    setLoading(true);
    setMessage("");

    const updateField = isCaptainA
      ? "team_a_reported_winner"
      : "team_b_reported_winner";

    const { error } = await supabase
      .from("matches")
      .update({ [updateField]: reportedWinner })
      .eq("id", match.id);

    if (error) {
      setMessage("Failed to report.");
      setLoading(false);
      return;
    }

    // Check if both teams reported the same winner
    const { data: updated } = await supabase
      .from("matches")
      .select("team_a_reported_winner, team_b_reported_winner")
      .eq("id", match.id)
      .single();

    if (
      updated?.team_a_reported_winner &&
      updated?.team_b_reported_winner
    ) {
      if (
        updated.team_a_reported_winner === updated.team_b_reported_winner
      ) {
        // Both agree - auto-confirm
        const winnerId = updated.team_a_reported_winner;
        const scoreA =
          winnerId === match.team_a_id
            ? Math.ceil(maxGames / 2)
            : Math.floor(maxGames / 2) - (maxGames > 1 ? 1 : 0);
        const scoreB =
          winnerId === match.team_b_id
            ? Math.ceil(maxGames / 2)
            : Math.floor(maxGames / 2) - (maxGames > 1 ? 1 : 0);

        await supabase
          .from("matches")
          .update({
            winner_id: winnerId,
            team_a_score: winnerId === match.team_a_id ? Math.ceil(maxGames / 2) : scoreA,
            team_b_score: winnerId === match.team_b_id ? Math.ceil(maxGames / 2) : scoreB,
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        // Update group standings
        await fetch(`/api/tournament/${tournamentId}/update-standings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: match.id }),
        });

        setMessage("Match confirmed! Both captains reported the same winner.");
      } else {
        // Disputed
        await supabase
          .from("matches")
          .update({ is_disputed: true })
          .eq("id", match.id);
        setMessage(
          "Dispute! Both captains reported different winners. An organizer will resolve this."
        );
      }
    } else {
      setMessage("Winner reported. Waiting for the other captain to confirm.");
    }

    // Save screenshots if provided
    const validUrls = screenshotUrls.filter((u) => u.trim());
    if (validUrls.length > 0 && isCaptainA) {
      // Check if game 1 exists
      const existingGame = games.find((g) => g.game_number === 1);
      if (existingGame) {
        await supabase
          .from("match_games")
          .update({ screenshot_urls: validUrls })
          .eq("id", existingGame.id);
      } else {
        await supabase.from("match_games").insert({
          match_id: match.id,
          game_number: 1,
          screenshot_urls: validUrls,
        });
      }
    }

    setLoading(false);
    router.refresh();
  };

  const handleOrganizerOverride = async (winnerId: string) => {
    setLoading(true);
    const scoreWin = Math.ceil(maxGames / 2);

    await supabase
      .from("matches")
      .update({
        winner_id: winnerId,
        team_a_score: winnerId === match.team_a_id ? scoreWin : 0,
        team_b_score: winnerId === match.team_b_id ? scoreWin : 0,
        is_completed: true,
        is_disputed: false,
        completed_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    // Update group standings
    await fetch(`/api/tournament/${tournamentId}/update-standings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id }),
    });

    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {teamA?.name ?? "TBD"} vs {teamB?.name ?? "TBD"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{match.bo_format.toUpperCase()}</Badge>
              <Badge variant="outline" className="capitalize">
                {match.stage}
              </Badge>
              {match.is_completed && (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {match.is_disputed && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Disputed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {match.is_completed && (
            <div className="text-center py-4">
              <p className="text-3xl font-bold">
                {match.team_a_score} - {match.team_b_score}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Winner:{" "}
                {match.winner_id === teamA?.id
                  ? teamA?.name
                  : teamB?.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshots */}
      {games.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Game Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            {games.map((game) => (
              <div key={game.id} className="space-y-2">
                <h4 className="text-sm font-medium">Game {game.game_number}</h4>
                <div className="flex flex-wrap gap-2">
                  {(game.screenshot_urls ?? []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline inline-flex items-center gap-1"
                    >
                      Screenshot {i + 1} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Report Form */}
      {canReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Match Result</CardTitle>
            <CardDescription>
              Select the winning team and optionally add screenshot links.
              Both captains must report the same winner for auto-confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Winner</Label>
              <Select value={reportedWinner} onValueChange={(v) => setReportedWinner(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select winner" />
                </SelectTrigger>
                <SelectContent>
                  {teamA && (
                    <SelectItem value={teamA.id}>
                      {teamA.name ?? "Team A"}
                    </SelectItem>
                  )}
                  {teamB && (
                    <SelectItem value={teamB.id}>
                      {teamB.name ?? "Team B"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Screenshot URLs (max 5)</Label>
              {screenshotUrls.map((url, i) => (
                <Input
                  key={i}
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...screenshotUrls];
                    newUrls[i] = e.target.value;
                    setScreenshotUrls(newUrls);
                  }}
                  placeholder={`Screenshot ${i + 1} URL`}
                />
              ))}
              {screenshotUrls.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setScreenshotUrls([...screenshotUrls, ""])
                  }
                >
                  Add Screenshot
                </Button>
              )}
            </div>

            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}

            <Button
              onClick={handleReportWinner}
              disabled={loading || !reportedWinner}
            >
              {loading ? "Reporting..." : "Submit Report"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Organizer Override */}
      {isOrganizer && !match.is_completed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizer Override</CardTitle>
            <CardDescription>
              Manually set the winner of this match.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {teamA && (
              <Button
                variant="outline"
                onClick={() => handleOrganizerOverride(teamA.id)}
                disabled={loading}
              >
                {teamA.name ?? "Team A"} Wins
              </Button>
            )}
            {teamB && (
              <Button
                variant="outline"
                onClick={() => handleOrganizerOverride(teamB.id)}
                disabled={loading}
              >
                {teamB.name ?? "Team B"} Wins
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Status */}
      {!match.is_completed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              Team A ({teamA?.name ?? "TBD"}):{" "}
              {match.team_a_reported_winner
                ? `Reported ${match.team_a_reported_winner === teamA?.id ? teamA?.name : teamB?.name}`
                : "Not yet reported"}
            </p>
            <p>
              Team B ({teamB?.name ?? "TBD"}):{" "}
              {match.team_b_reported_winner
                ? `Reported ${match.team_b_reported_winner === teamA?.id ? teamA?.name : teamB?.name}`
                : "Not yet reported"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
