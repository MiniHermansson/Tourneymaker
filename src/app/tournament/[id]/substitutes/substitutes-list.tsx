"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { RankBadge } from "@/components/rank-badge";
import { RoleBadge } from "@/components/role-badge";
import type { LolRank, LolRole } from "@/lib/constants";

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
  user_id: string;
  value: number;
}

interface SubstitutesListProps {
  substitutes: Registration[];
  playerValues: PlayerValue[];
}

export function SubstitutesList({
  substitutes,
  playerValues,
}: SubstitutesListProps) {
  const valueMap = useMemo(
    () => new Map(playerValues.map((pv) => [pv.user_id, pv.value])),
    [playerValues]
  );

  if (substitutes.length === 0) {
    return (
      <p className="text-muted-foreground">
        No available substitutes. Either no undrafted players opted in as
        substitutes, or all substitutes have been drafted.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Player</th>
            <th className="px-3 py-2 text-left font-medium">Roles</th>
            <th className="px-3 py-2 text-left font-medium">Current Rank</th>
            <th className="px-3 py-2 text-left font-medium">Peak Rank</th>
            <th className="px-3 py-2 text-left font-medium">op.gg</th>
            <th className="px-3 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {substitutes.map((reg) => {
            const p = reg.profiles;
            const opggUrl = p?.opgg_url as string | null;
            const value = valueMap.get(reg.user_id) ?? 0;

            return (
              <tr key={reg.id} className="border-b">
                <td className="px-3 py-2 font-medium">
                  <div>
                    {(p?.discord_username as string) ?? "Unknown"}
                    {(p?.lol_gamertag as string) && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({p.lol_gamertag as string})
                      </span>
                    )}
                  </div>
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
                    rank={(p?.current_rank as LolRank) ?? "unranked"}
                    tier={p?.current_rank_tier as string | null}
                  />
                </td>
                <td className="px-3 py-2">
                  <RankBadge
                    rank={(p?.peak_rank as LolRank) ?? "unranked"}
                    tier={p?.peak_rank_tier as string | null}
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
                  <Badge
                    variant={
                      value >= 5
                        ? "default"
                        : value >= 3
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {value}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 text-sm text-muted-foreground border-t bg-muted/30">
        {substitutes.length} substitute{substitutes.length !== 1 ? "s" : ""}{" "}
        available
      </div>
    </div>
  );
}
