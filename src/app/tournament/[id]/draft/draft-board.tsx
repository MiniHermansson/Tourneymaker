"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeDraft } from "@/hooks/use-realtime-draft";
import { generateSnakeDraftOrder, validatePick } from "@/lib/tournament/draft-engine";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOL_ROLES, LOL_ROLE_LABELS, type LolRole } from "@/lib/constants";
import { ExternalLink, Play, Undo2, Wifi, WifiOff } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";
import type { Database } from "@/lib/types/database";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type DraftState = Database["public"]["Tables"]["draft_state"]["Row"];
type DraftPick = Database["public"]["Tables"]["draft_picks"]["Row"];

interface DraftBoardProps {
  tournamentId: string;
  tournament: Tournament;
  registrations: Array<{
    id: string;
    user_id: string;
    main_role: string;
    secondary_role: string;
    profiles: Record<string, unknown>;
  }>;
  playerValues: Array<{ user_id: string; value: number }>;
  teams: Array<{
    id: string;
    captain_id: string | null;
    name: string | null;
    budget_remaining: number | null;
    profiles: Record<string, unknown> | null;
    team_members: Array<{
      user_id: string;
      draft_value: number | null;
      profiles: Record<string, unknown>;
    }>;
  }>;
  initialDraftState: DraftState | null;
  draftOrder: Array<{
    pick_number: number;
    round: number;
    team_id: string;
  }>;
  initialPicks: DraftPick[];
  isOrganizer: boolean;
}

export function DraftBoard({
  tournamentId,
  tournament,
  registrations,
  playerValues,
  teams,
  initialDraftState,
  draftOrder: initialDraftOrder,
  initialPicks,
  isOrganizer,
}: DraftBoardProps) {
  const router = useRouter();
  const supabase = createClient();

  const { picks, draftState, isConnected } = useRealtimeDraft(
    tournamentId,
    initialPicks,
    initialDraftState
  );

  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const valueMap = useMemo(
    () => new Map(playerValues.map((pv) => [pv.user_id, pv.value])),
    [playerValues]
  );

  const draftedUserIds = useMemo(
    () => new Set(picks.map((p) => p.user_id)),
    [picks]
  );

  // Compute budgets client-side from real-time picks to keep all users in sync
  const teamBudgets = useMemo(() => {
    const budgets = new Map<string, number>();
    for (const team of teams) {
      // Start from the initial budget (set at draft start, accounts for captain cost)
      let budget = team.budget_remaining ?? 0;
      // Subtract values of picks received in real-time that aren't already
      // in the server-loaded team_members (to avoid double-counting on refresh)
      const existingMemberIds = new Set(
        team.team_members?.map((m) => m.user_id) ?? []
      );
      for (const pick of picks) {
        if (pick.team_id === team.id && !existingMemberIds.has(pick.user_id)) {
          budget -= pick.value;
        }
      }
      budgets.set(team.id, budget);
    }
    return budgets;
  }, [teams, picks]);

  const currentPick = draftState?.current_pick ?? 1;
  const currentDraftSlot = initialDraftOrder.find(
    (o) => o.pick_number === currentPick
  );
  const currentTeam = teams.find((t) => t.id === currentDraftSlot?.team_id);

  const availablePlayers = useMemo(() => {
    return registrations
      .filter((reg) => {
        if (draftedUserIds.has(reg.user_id)) return false;
        // Don't show captains in the available pool
        if (teams.some((t) => t.captain_id === reg.user_id)) return false;

        if (roleFilter !== "all") {
          if (reg.main_role !== roleFilter && reg.secondary_role !== roleFilter)
            return false;
        }

        if (searchQuery) {
          const name = ((reg.profiles?.discord_username as string) ?? "").toLowerCase();
          if (!name.includes(searchQuery.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = valueMap.get(a.user_id) ?? 0;
        const valB = valueMap.get(b.user_id) ?? 0;
        return valB - valA;
      });
  }, [registrations, draftedUserIds, teams, roleFilter, searchQuery, valueMap]);

  const handleStartDraft = async () => {
    setLoading(true);

    // Generate draft order if not exists
    if (initialDraftOrder.length === 0) {
      const teamIds = teams.map((t) => t.id);
      // 4 picks per team (5 players total - captain already on team)
      const order = generateSnakeDraftOrder(teamIds, 4);

      await supabase.from("draft_order").insert(
        order.map((o) => ({
          tournament_id: tournamentId,
          pick_number: o.pickNumber,
          round: o.round,
          team_id: o.teamId,
        }))
      );

      await supabase.from("draft_state").insert({
        tournament_id: tournamentId,
        current_pick: 1,
        total_picks: order.length,
        is_active: true,
        started_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("draft_state")
        .update({ is_active: true, started_at: new Date().toISOString() })
        .eq("tournament_id", tournamentId);
    }

    setLoading(false);
    router.refresh();
  };

  const handlePickPlayer = async () => {
    if (!selectedPlayer || !currentDraftSlot || !currentTeam) return;
    setLoading(true);

    const playerValue = valueMap.get(selectedPlayer) ?? 0;
    const budget = teamBudgets.get(currentTeam.id) ?? 0;

    const validation = validatePick(budget, playerValue, 1);
    if (!validation.valid) {
      setLoading(false);
      return;
    }

    // Record the pick
    await supabase.from("draft_picks").insert({
      tournament_id: tournamentId,
      pick_number: currentPick,
      round: currentDraftSlot.round,
      team_id: currentDraftSlot.team_id,
      user_id: selectedPlayer,
      value: playerValue,
    });

    // Add to team members
    await supabase.from("team_members").insert({
      team_id: currentDraftSlot.team_id,
      user_id: selectedPlayer,
      draft_value: playerValue,
      draft_pick_order: currentPick,
    });

    // Update team budget in DB
    await supabase
      .from("teams")
      .update({ budget_remaining: budget - playerValue })
      .eq("id", currentDraftSlot.team_id);

    // Advance draft state
    const isLastPick = currentPick >= (draftState?.total_picks ?? 0);
    await supabase
      .from("draft_state")
      .update({
        current_pick: currentPick + 1,
        is_active: !isLastPick,
        completed_at: isLastPick ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("tournament_id", tournamentId);

    setSelectedPlayer(null);
    setConfirmOpen(false);
    setLoading(false);
    router.refresh();
  };

  const handleUndoPick = async () => {
    if (picks.length === 0) return;
    setLoading(true);

    const lastPick = picks[picks.length - 1];
    const team = teams.find((t) => t.id === lastPick.team_id);

    // Remove the draft pick
    await supabase
      .from("draft_picks")
      .delete()
      .eq("id", lastPick.id);

    // Remove from team members
    await supabase
      .from("team_members")
      .delete()
      .eq("team_id", lastPick.team_id)
      .eq("user_id", lastPick.user_id);

    // Restore team budget
    const currentBudget = teamBudgets.get(lastPick.team_id) ?? 0;
    await supabase
      .from("teams")
      .update({
        budget_remaining: currentBudget + lastPick.value,
      })
      .eq("id", lastPick.team_id);

    // Step draft state back
    await supabase
      .from("draft_state")
      .update({
        current_pick: lastPick.pick_number,
        is_active: true,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("tournament_id", tournamentId);

    setLoading(false);
    router.refresh();
  };

  const selectedPlayerData = registrations.find(
    (r) => r.user_id === selectedPlayer
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Captains Draft</h2>
          {isConnected ? (
            <Badge variant="secondary" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <WifiOff className="h-3 w-3 mr-1" /> Connecting...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOrganizer && picks.length > 0 && (draftState?.is_active || draftState?.completed_at) && (
            <Button
              variant="outline"
              onClick={handleUndoPick}
              disabled={loading}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo Pick
            </Button>
          )}
          {isOrganizer && !draftState?.is_active && !draftState?.completed_at && (
            <Button onClick={handleStartDraft} disabled={loading}>
              <Play className="mr-2 h-4 w-4" />
              Start Draft
            </Button>
          )}
        </div>
      </div>

      {draftState?.completed_at && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="font-semibold text-lg">Draft Complete!</p>
          </CardContent>
        </Card>
      )}

      {/* Current Pick Info */}
      {draftState?.is_active && currentTeam && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardDescription>
              Pick #{currentPick} of {draftState.total_picks} — Round{" "}
              {currentDraftSlot?.round}
            </CardDescription>
            <CardTitle>
              {currentTeam.name ??
                `Team ${(currentTeam.profiles as Record<string, unknown>)?.discord_username ?? "?"}`}
              &apos;s Pick
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Budget remaining:{" "}
              <span className="font-semibold text-foreground">
                {teamBudgets.get(currentTeam.id) ?? 0}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Player Pool */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Players</CardTitle>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40"
                />
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {LOL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {LOL_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {availablePlayers.map((reg) => {
                  const p = reg.profiles;
                  const value = valueMap.get(reg.user_id) ?? 0;
                  const opggUrl = p?.opgg_url as string | null;
                  const isSelected = selectedPlayer === reg.user_id;
                  const canAfford =
                    (teamBudgets.get(currentTeam?.id ?? "") ?? 0) >= value;

                  return (
                    <div
                      key={reg.id}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : canAfford
                            ? "hover:bg-accent/50"
                            : "opacity-50"
                      }`}
                      onClick={() => {
                        if (isOrganizer && draftState?.is_active && canAfford) {
                          setSelectedPlayer(reg.user_id);
                          setConfirmOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            value >= 5
                              ? "default"
                              : value >= 3
                                ? "secondary"
                                : "outline"
                          }
                          className="w-8 justify-center"
                        >
                          {value}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {(p?.discord_username as string) ?? "Unknown"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <RoleBadge role={reg.main_role as LolRole} />
                            {reg.secondary_role !== reg.main_role && (
                              <RoleBadge role={reg.secondary_role as LolRole} />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {opggUrl && (
                          <a
                            href={opggUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                {availablePlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No available players match your filters.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Rosters */}
        <div className="space-y-3">
          {teams.map((team) => {
            const captain = team.profiles as Record<string, unknown> | null;
            const isCurrentTeam = team.id === currentDraftSlot?.team_id;

            // Combine initial members with newly drafted picks
            const teamPicks = picks.filter((p) => p.team_id === team.id);
            const memberUserIds = new Set([
              ...(team.team_members?.map((m) => m.user_id) ?? []),
              ...teamPicks.map((p) => p.user_id),
            ]);

            return (
              <Card
                key={team.id}
                className={isCurrentTeam ? "border-primary" : ""}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>
                      {team.name ??
                        `Team ${(captain?.discord_username as string) ?? "?"}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Budget: {teamBudgets.get(team.id) ?? 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    {/* Captain */}
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>
                        {(captain?.discord_username as string) ?? "?"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Captain
                      </Badge>
                    </div>
                    {/* Members */}
                    {Array.from(memberUserIds)
                      .filter((uid) => uid !== team.captain_id)
                      .map((uid) => {
                        const reg = registrations.find(
                          (r) => r.user_id === uid
                        );
                        const pick = picks.find(
                          (p) => p.user_id === uid && p.team_id === team.id
                        );
                        return (
                          <div
                            key={uid}
                            className="flex items-center justify-between"
                          >
                            <span>
                              {(reg?.profiles?.discord_username as string) ??
                                "Unknown"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {pick?.value ?? valueMap.get(uid) ?? "?"}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Draft History */}
      {picks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {picks.map((pick) => {
                const reg = registrations.find(
                  (r) => r.user_id === pick.user_id
                );
                const team = teams.find((t) => t.id === pick.team_id);
                const captain = team?.profiles as Record<
                  string,
                  unknown
                > | null;
                return (
                  <Badge key={pick.id} variant="secondary" className="text-xs">
                    #{pick.pick_number}{" "}
                    {(reg?.profiles?.discord_username as string) ?? "?"} →{" "}
                    {team?.name ??
                      (captain?.discord_username as string) ?? "?"}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Pick Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pick</DialogTitle>
            <DialogDescription>
              Pick{" "}
              <strong>
                {(selectedPlayerData?.profiles?.discord_username as string) ??
                  "Unknown"}
              </strong>{" "}
              (value: {valueMap.get(selectedPlayer ?? "") ?? 0}) for{" "}
              <strong>
                {currentTeam?.name ??
                  `Team ${(currentTeam?.profiles as Record<string, unknown>)?.discord_username ?? "?"}`}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setSelectedPlayer(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePickPlayer} disabled={loading}>
              {loading ? "Picking..." : "Confirm Pick"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
