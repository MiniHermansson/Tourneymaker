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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/types/database";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

interface PlanningConfigProps {
  tournament: Tournament;
  disabled: boolean;
}

export function PlanningConfig({ tournament, disabled }: PlanningConfigProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [groupCount, setGroupCount] = useState(tournament.group_count ?? 2);
  const [groupSize, setGroupSize] = useState(tournament.group_size ?? 4);
  const [playoffType, setPlayoffType] = useState(
    tournament.playoff_type ?? "single_elimination"
  );
  const [groupBo, setGroupBo] = useState(tournament.group_bo_format ?? "bo1");
  const [playoffBo, setPlayoffBo] = useState(
    tournament.playoff_bo_format ?? "bo3"
  );
  const [finalsBo, setFinalsBo] = useState(
    tournament.finals_bo_format ?? "bo5"
  );
  const [teamsAdvancing, setTeamsAdvancing] = useState(
    tournament.teams_advancing_per_group ?? 2
  );
  const [teamBudget, setTeamBudget] = useState(tournament.team_budget ?? 15);
  const [defaultValue, setDefaultValue] = useState(
    tournament.default_player_value ?? 3
  );
  const [minValue, setMinValue] = useState(tournament.min_player_value ?? 0);
  const [maxValue, setMaxValue] = useState(tournament.max_player_value ?? 7);

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        group_count: groupCount,
        group_size: groupSize,
        playoff_type: playoffType,
        group_bo_format: groupBo,
        playoff_bo_format: playoffBo,
        finals_bo_format: finalsBo,
        teams_advancing_per_group: teamsAdvancing,
        team_budget: teamBudget,
        default_player_value: defaultValue,
        min_player_value: minValue,
        max_player_value: maxValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tournament.id);

    setLoading(false);
    if (error) {
      setMessage("Failed to save.");
    } else {
      setMessage("Settings saved.");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Configuration</CardTitle>
        <CardDescription>
          Set up groups, playoff format, and match settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Number of Groups</Label>
            <Input
              type="number"
              min={1}
              max={16}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value))}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Teams per Group</Label>
            <Input
              type="number"
              min={2}
              max={8}
              value={groupSize}
              onChange={(e) => setGroupSize(Number(e.target.value))}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Teams Advancing per Group</Label>
            <Input
              type="number"
              min={1}
              max={groupSize}
              value={teamsAdvancing}
              onChange={(e) => setTeamsAdvancing(Number(e.target.value))}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Playoff Format</Label>
            <Select
              value={playoffType}
              onValueChange={(v) => setPlayoffType(v ?? "single_elimination")}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_elimination">
                  Single Elimination
                </SelectItem>
                <SelectItem value="double_elimination">
                  Double Elimination
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Group Stage BO</Label>
            <Select value={groupBo} onValueChange={(v) => setGroupBo(v ?? "bo1")} disabled={disabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bo1">Best of 1</SelectItem>
                <SelectItem value="bo3">Best of 3</SelectItem>
                <SelectItem value="bo5">Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Playoff BO</Label>
            <Select
              value={playoffBo}
              onValueChange={(v) => setPlayoffBo(v ?? "bo3")}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bo1">Best of 1</SelectItem>
                <SelectItem value="bo3">Best of 3</SelectItem>
                <SelectItem value="bo5">Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Finals BO</Label>
            <Select
              value={finalsBo}
              onValueChange={(v) => setFinalsBo(v ?? "bo5")}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bo1">Best of 1</SelectItem>
                <SelectItem value="bo3">Best of 3</SelectItem>
                <SelectItem value="bo5">Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {tournament.format === "captains_draft" && (
          <>
            <h3 className="text-sm font-semibold mt-4">Economy Settings</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Team Budget</Label>
                <Input
                  type="number"
                  min={1}
                  value={teamBudget}
                  onChange={(e) => setTeamBudget(Number(e.target.value))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Player Value</Label>
                <Input
                  type="number"
                  min={minValue}
                  max={maxValue}
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(Number(e.target.value))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Value</Label>
                <Input
                  type="number"
                  min={0}
                  value={minValue}
                  onChange={(e) => setMinValue(Number(e.target.value))}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Value</Label>
                <Input
                  type="number"
                  min={minValue}
                  value={maxValue}
                  onChange={(e) => setMaxValue(Number(e.target.value))}
                  disabled={disabled}
                />
              </div>
            </div>
          </>
        )}

        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        {!disabled && (
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
