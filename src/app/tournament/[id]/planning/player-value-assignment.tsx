"use client";

import { useState, useEffect } from "react";
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
import { ExternalLink, Save } from "lucide-react";
import { type LolRole, type LolRank } from "@/lib/constants";
import { RankBadge } from "@/components/rank-badge";
import { RoleBadge } from "@/components/role-badge";

interface Registration {
  id: string;
  user_id: string;
  main_role: string;
  secondary_role: string;
  rank_at_registration: string | null;
  rank_tier_at_registration: string | null;
  profiles: Record<string, unknown>;
}

interface PlayerValue {
  id: string;
  user_id: string;
  value: number;
}

interface PlayerValueAssignmentProps {
  tournamentId: string;
  registrations: Registration[];
  playerValues: PlayerValue[];
  disabled: boolean;
  defaultValue: number;
  minValue: number;
  maxValue: number;
}

export function PlayerValueAssignment({
  tournamentId,
  registrations,
  playerValues,
  disabled,
  defaultValue,
  minValue,
  maxValue,
}: PlayerValueAssignmentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const valueMap = new Map(playerValues.map((pv) => [pv.user_id, pv.value]));
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    registrations.forEach((reg) => {
      initial[reg.user_id] = valueMap.get(reg.user_id) ?? defaultValue;
    });
    setValues(initial);
  }, [registrations, playerValues, defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAll = async () => {
    setLoading(true);
    setMessage("");

    const upserts = Object.entries(values).map(([userId, value]) => ({
      tournament_id: tournamentId,
      user_id: userId,
      value: Math.max(minValue, Math.min(maxValue, value)),
    }));

    const { error } = await supabase
      .from("draft_player_values")
      .upsert(upserts, { onConflict: "tournament_id,user_id" });

    setLoading(false);
    if (error) {
      setMessage("Failed to save values.");
    } else {
      setMessage("All player values saved.");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Values</CardTitle>
        <CardDescription>
          Assign a value ({minValue}-{maxValue}) to each player for the captains
          draft economy. Use their rank to help evaluate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Player</th>
                <th className="px-3 py-2 text-left font-medium">Roles</th>
                <th className="px-3 py-2 text-left font-medium">Rank</th>
                <th className="px-3 py-2 text-left font-medium">op.gg</th>
                <th className="px-3 py-2 text-left font-medium w-20">Value</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => {
                const p = reg.profiles;
                const opggUrl = p?.opgg_url as string | null;
                return (
                  <tr key={reg.id} className="border-b">
                    <td className="px-3 py-2 font-medium">
                      {(p?.discord_username as string) ?? "Unknown"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <RoleBadge role={reg.main_role as LolRole} />
                        {reg.secondary_role !== reg.main_role && (
                          <RoleBadge role={reg.secondary_role as LolRole} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <RankBadge
                        rank={(reg.rank_at_registration as LolRank) ?? "unranked"}
                        tier={reg.rank_tier_at_registration}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {opggUrl && (
                        <a
                          href={opggUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          op.gg
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={minValue}
                        max={maxValue}
                        value={values[reg.user_id] ?? defaultValue}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [reg.user_id]: Number(e.target.value),
                          }))
                        }
                        disabled={disabled}
                        className="w-16 h-8"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground mt-3">{message}</p>
        )}

        {!disabled && (
          <Button onClick={handleSaveAll} disabled={loading} className="mt-4">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save All Values"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
